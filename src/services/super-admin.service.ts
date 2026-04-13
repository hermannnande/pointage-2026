"use server";

import { prisma } from "@/lib/prisma/client";
import type { SubStatus } from "@prisma/client";

// ─── Helpers ─────────────────────────────────────────────────

function startOfDay(d = new Date()) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}
function startOfWeek(d = new Date()) {
  const s = new Date(d);
  s.setDate(s.getDate() - s.getDay() + 1);
  s.setHours(0, 0, 0, 0);
  return s;
}
function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

// ─── Auth ────────────────────────────────────────────────────

export async function isSuperAdmin(supabaseUid: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { supabaseUid },
    select: { isSuperAdmin: true },
  });
  return user?.isSuperAdmin === true;
}

export async function getSuperAdminUser(supabaseUid: string) {
  return prisma.user.findUnique({
    where: { supabaseUid },
    select: { id: true, email: true, fullName: true, isSuperAdmin: true, superAdminRole: true },
  });
}

// ─── Dashboard KPIs ──────────────────────────────────────────

export async function getDashboardKPIs() {
  const today = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [
    totalCompanies,
    newToday,
    newThisWeek,
    newThisMonth,
    activeCompanies,
    totalEmployees,
    totalSites,
    subscriptionStats,
    revenueMonth,
    revenueTotal,
    txSuccess,
    txFailed,
    recentActiveCompanies,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { createdAt: { gte: today } } }),
    prisma.company.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.company.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.company.count({ where: { isActive: true } }),
    prisma.employee.count(),
    prisma.site.count(),
    prisma.subscription.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.billingEvent.aggregate({
      where: { createdAt: { gte: monthStart }, type: "payment_success" },
      _sum: { amount: true },
    }),
    prisma.billingEvent.aggregate({
      where: { type: "payment_success" },
      _sum: { amount: true },
    }),
    prisma.billingEvent.count({ where: { type: "payment_success" } }),
    prisma.billingEvent.count({ where: { type: "payment_failed" } }),
    prisma.attendanceRecord.findMany({
      where: { date: { gte: sevenDaysAgo } },
      select: { companyId: true },
      distinct: ["companyId"],
    }),
  ]);

  const statusMap: Record<string, number> = {};
  for (const s of subscriptionStats) statusMap[s.status] = s._count.id;

  const trialing = statusMap["TRIALING"] ?? 0;
  const activeSubs = statusMap["ACTIVE"] ?? 0;
  const expired = statusMap["EXPIRED"] ?? 0;
  const cancelled = statusMap["CANCELLED"] ?? 0;
  const pastDue = statusMap["PAST_DUE"] ?? 0;

  const totalConverted = activeSubs + cancelled + expired;
  const conversionRate = trialing + totalConverted > 0
    ? Math.round((totalConverted / (trialing + totalConverted)) * 100)
    : 0;

  return {
    totalCompanies,
    newToday,
    newThisWeek,
    newThisMonth,
    activeCompanies,
    inactiveCompanies: totalCompanies - activeCompanies,
    totalEmployees,
    totalSites,
    trialing,
    activeSubs,
    expired,
    cancelled,
    pastDue,
    revenueMonth: revenueMonth._sum.amount ?? 0,
    revenueTotal: revenueTotal._sum.amount ?? 0,
    txSuccess,
    txFailed,
    conversionRate,
    recentActiveCompanies: recentActiveCompanies.length,
  };
}

// ─── Charts Data ─────────────────────────────────────────────

export async function getRegistrationTrend(months = 6) {
  const since = monthsAgo(months);
  const companies = await prisma.company.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped: Record<string, number> = {};
  for (const c of companies) {
    const key = c.createdAt.toISOString().slice(0, 7);
    grouped[key] = (grouped[key] ?? 0) + 1;
  }
  return Object.entries(grouped).map(([month, count]) => ({ month, count }));
}

export async function getRevenueTrend(months = 6) {
  const since = monthsAgo(months);
  const events = await prisma.billingEvent.findMany({
    where: { createdAt: { gte: since }, type: "payment_success" },
    select: { createdAt: true, amount: true },
    orderBy: { createdAt: "asc" },
  });

  const grouped: Record<string, number> = {};
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 7);
    grouped[key] = (grouped[key] ?? 0) + (e.amount ?? 0);
  }
  return Object.entries(grouped).map(([month, revenue]) => ({ month, revenue }));
}

export async function getSubscriptionDistribution() {
  const stats = await prisma.subscription.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  return stats.map((s) => ({ status: s.status, count: s._count.id }));
}

export async function getTopActiveCompanies(limit = 10) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const records = await prisma.attendanceRecord.groupBy({
    by: ["companyId"],
    where: { date: { gte: sevenDaysAgo } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  const companyIds = records.map((r) => r.companyId);
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(companies.map((c) => [c.id, c.name]));

  return records.map((r) => ({
    companyId: r.companyId,
    name: nameMap.get(r.companyId) ?? "—",
    clockings: r._count.id,
  }));
}

// ─── Companies ───────────────────────────────────────────────

export type CompanyFilter = {
  search?: string;
  status?: "active" | "inactive" | "suspended";
  subscription?: SubStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
};

export async function getCompanies(filters: CompanyFilter = {}) {
  const {
    search,
    status,
    subscription,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = 20,
    sortBy = "createdAt",
    sortDir = "desc",
  } = filters;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }
  if (subscription) {
    where.subscription = { status: subscription };
  }

  const orderBy: Record<string, string> = {};
  if (sortBy === "name" || sortBy === "createdAt") orderBy[sortBy] = sortDir;
  else orderBy.createdAt = sortDir;

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { employees: true, sites: true } },
      },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: companies.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      email: c.email,
      phone: c.phone,
      country: c.country,
      sector: c.sector,
      isActive: c.isActive,
      createdAt: c.createdAt,
      trialEndsAt: c.trialEndsAt,
      employeeCount: c._count.employees,
      siteCount: c._count.sites,
      subStatus: c.subscription?.status ?? null,
      planName: c.subscription?.plan?.name ?? null,
      planSlug: c.subscription?.plan?.slug ?? null,
      billingCycle: c.subscription?.billingCycle ?? null,
      currentPeriodEnd: c.subscription?.currentPeriodEnd ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getCompanyDetail(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      subscription: { include: { plan: true } },
      sites: { select: { id: true, name: true, city: true, isActive: true, _count: { select: { employees: true } } } },
      employees: {
        select: { id: true, firstName: true, lastName: true, matricule: true, position: true, isActive: true, createdAt: true, site: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      memberships: {
        include: { user: { select: { id: true, email: true, fullName: true, lastLoginAt: true } }, role: { select: { name: true, slug: true } } },
      },
      billingEvents: { orderBy: { createdAt: "desc" }, take: 20 },
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      adminNotes: {
        include: { author: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { employees: true, sites: true } },
    },
  });
  if (!company) return null;

  const attendanceStats = await prisma.attendanceRecord.aggregate({
    where: { companyId },
    _count: { id: true },
  });

  const revenueTotal = await prisma.billingEvent.aggregate({
    where: { companyId, type: "payment_success" },
    _sum: { amount: true },
  });

  return {
    ...company,
    totalClockings: attendanceStats._count.id,
    totalRevenue: revenueTotal._sum.amount ?? 0,
  };
}

// ─── Admin Actions ───────────────────────────────────────────

export async function suspendCompany(companyId: string, actorId: string) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { isActive: false },
  });
  await logSuperAdminAction(actorId, "SUSPEND_COMPANY", "Company", companyId, company.name, "true", "false");
  return company;
}

export async function reactivateCompany(companyId: string, actorId: string) {
  const company = await prisma.company.update({
    where: { id: companyId },
    data: { isActive: true },
  });
  await logSuperAdminAction(actorId, "REACTIVATE_COMPANY", "Company", companyId, company.name, "false", "true");
  return company;
}

export async function extendTrial(companyId: string, days: number, actorId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error("Entreprise introuvable");

  const base = company.trialEndsAt && company.trialEndsAt > new Date() ? company.trialEndsAt : new Date();
  const newEnd = new Date(base);
  newEnd.setDate(newEnd.getDate() + days);

  await prisma.company.update({ where: { id: companyId }, data: { trialEndsAt: newEnd } });
  if (company.trialEndsAt) {
    await prisma.subscription.updateMany({
      where: { companyId, status: { in: ["TRIALING", "EXPIRED"] } },
      data: { trialEndsAt: newEnd, status: "TRIALING" },
    });
  }

  await logSuperAdminAction(actorId, "EXTEND_TRIAL", "Company", companyId, company.name, company.trialEndsAt?.toISOString() ?? "null", newEnd.toISOString(), `+${days} jours`);
  return newEnd;
}

export async function changePlanManual(companyId: string, planSlug: string, actorId: string) {
  const plan = await prisma.plan.findUnique({ where: { slug: planSlug } });
  if (!plan) throw new Error("Plan introuvable");

  const sub = await prisma.subscription.findUnique({ where: { companyId } });
  const oldPlan = sub?.planId ?? "none";

  if (sub) {
    await prisma.subscription.update({
      where: { companyId },
      data: { planId: plan.id, status: "ACTIVE" },
    });
  } else {
    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);
    await prisma.subscription.create({
      data: {
        companyId,
        planId: plan.id,
        status: "ACTIVE",
        billingCycle: "MONTHLY",
        currentPeriodStart: now,
        currentPeriodEnd: end,
      },
    });
  }

  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } });
  await logSuperAdminAction(actorId, "CHANGE_PLAN", "Subscription", companyId, company?.name ?? companyId, oldPlan, plan.id, `→ ${plan.name}`);
}

export async function addAdminNote(companyId: string, authorId: string, content: string) {
  const note = await prisma.adminNote.create({
    data: { companyId, authorId, content },
  });
  await logSuperAdminAction(authorId, "ADD_NOTE", "Company", companyId, undefined, undefined, undefined, content.slice(0, 100));
  return note;
}

// ─── Global Employees ───────────────────────────────────────

export type EmployeeFilter = {
  search?: string;
  companyId?: string;
  siteId?: string;
  status?: "active" | "inactive";
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export async function getGlobalEmployees(filters: EmployeeFilter = {}) {
  const { search, companyId, siteId, status, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { matricule: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (companyId) where.companyId = companyId;
  if (siteId) where.siteId = siteId;
  if (status === "active") where.isActive = true;
  if (status === "inactive") where.isActive = false;
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      select: {
        id: true, firstName: true, lastName: true, matricule: true, email: true,
        position: true, contractType: true, isActive: true, createdAt: true,
        company: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: employees, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getEmployeeGrowthStats() {
  const today = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const [newToday, newWeek, newMonth] = await Promise.all([
    prisma.employee.count({ where: { createdAt: { gte: today } } }),
    prisma.employee.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.employee.count({ where: { createdAt: { gte: monthStart } } }),
  ]);

  return { newToday, newWeek, newMonth };
}

// ─── Subscriptions ───────────────────────────────────────────

export type SubFilter = {
  status?: SubStatus;
  planSlug?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getSubscriptions(filters: SubFilter = {}) {
  const { status, planSlug, search, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (planSlug) where.plan = { slug: planSlug };
  if (search) {
    where.company = { name: { contains: search, mode: "insensitive" } };
  }

  const [total, subs] = await Promise.all([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      include: {
        company: { select: { id: true, name: true, email: true, country: true } },
        plan: { select: { id: true, name: true, slug: true, priceMonthly: true, priceYearly: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: subs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getSubscriptionKPIs() {
  const monthStart = startOfMonth();

  const [activeSubs, mrr, yearlyRevenue] = await Promise.all([
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      include: { plan: true },
    }),
    prisma.billingEvent.aggregate({
      where: { type: "payment_success", createdAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.billingEvent.aggregate({
      where: { type: "payment_success" },
      _sum: { amount: true },
    }),
  ]);

  const subsByPlan: Record<string, number> = {};
  for (const s of activeSubs) {
    const planName = s.plan?.name ?? "Inconnu";
    subsByPlan[planName] = (subsByPlan[planName] ?? 0) + 1;
  }

  return {
    activeCount: activeSubs.length,
    mrrEstimate: mrr._sum.amount ?? 0,
    totalRevenue: yearlyRevenue._sum.amount ?? 0,
    byPlan: Object.entries(subsByPlan).map(([plan, count]) => ({ plan, count })),
  };
}

// ─── Transactions ────────────────────────────────────────────

export type TxFilter = {
  type?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export async function getTransactions(filters: TxFilter = {}) {
  const { type, search, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (search) where.company = { name: { contains: search, mode: "insensitive" } };
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [total, transactions] = await Promise.all([
    prisma.billingEvent.count({ where }),
    prisma.billingEvent.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: transactions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getTransactionKPIs() {
  const today = startOfDay();
  const monthStart = startOfMonth();

  const [totalTx, successTotal, failedTotal, revenueToday, revenueMonth, revenueAll] = await Promise.all([
    prisma.billingEvent.count(),
    prisma.billingEvent.count({ where: { type: "payment_success" } }),
    prisma.billingEvent.count({ where: { type: "payment_failed" } }),
    prisma.billingEvent.aggregate({ where: { type: "payment_success", createdAt: { gte: today } }, _sum: { amount: true } }),
    prisma.billingEvent.aggregate({ where: { type: "payment_success", createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.billingEvent.aggregate({ where: { type: "payment_success" }, _sum: { amount: true } }),
  ]);

  return {
    totalTx,
    successTotal,
    failedTotal,
    revenueToday: revenueToday._sum.amount ?? 0,
    revenueMonth: revenueMonth._sum.amount ?? 0,
    revenueAll: revenueAll._sum.amount ?? 0,
  };
}

// ─── Trials ──────────────────────────────────────────────────

export type TrialFilter = {
  status?: "active" | "expiring" | "expired" | "converted";
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getTrials(filters: TrialFilter = {}) {
  const { status, search, page = 1, pageSize = 20 } = filters;
  const now = new Date();
  const threeDays = new Date();
  threeDays.setDate(threeDays.getDate() + 3);

  const where: Record<string, unknown> = {};
  where.trialEndsAt = { not: null };

  if (search) {
    where.name = { contains: search, mode: "insensitive" };
  }

  if (status === "active") {
    where.trialEndsAt = { gt: now };
    where.subscription = { status: "TRIALING" };
  } else if (status === "expiring") {
    where.trialEndsAt = { gt: now, lte: threeDays };
  } else if (status === "expired") {
    where.trialEndsAt = { lt: now };
    where.subscription = { status: { in: ["EXPIRED", "TRIALING"] } };
  } else if (status === "converted") {
    where.subscription = { status: { in: ["ACTIVE", "PAST_DUE"] } };
  }

  const [total, companies] = await Promise.all([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { employees: true, sites: true } },
      },
      orderBy: { trialEndsAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    data: companies.map((c) => {
      const daysLeft = c.trialEndsAt ? Math.ceil((c.trialEndsAt.getTime() - now.getTime()) / 86400000) : 0;
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt,
        trialEndsAt: c.trialEndsAt,
        daysLeft: Math.max(0, daysLeft),
        subStatus: c.subscription?.status ?? null,
        planName: c.subscription?.plan?.name ?? null,
        employeeCount: c._count.employees,
        siteCount: c._count.sites,
      };
    }),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// ─── Activity ────────────────────────────────────────────────

export async function getRecentActivity(limit = 30) {
  const [newCompanies, recentPayments, recentLogs] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, createdAt: true },
    }),
    prisma.billingEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { company: { select: { name: true } } },
    }),
    prisma.superAdminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { fullName: true } } },
    }),
  ]);

  type ActivityItem = { date: Date; type: string; detail: string; entity: string };
  const items: ActivityItem[] = [];

  for (const c of newCompanies) {
    items.push({ date: c.createdAt, type: "new_company", detail: c.name, entity: c.id });
  }
  for (const p of recentPayments) {
    items.push({ date: p.createdAt, type: p.type, detail: `${p.company.name} — ${p.amount ?? 0} ${p.currency ?? "XOF"}`, entity: p.companyId });
  }
  for (const l of recentLogs) {
    items.push({ date: l.createdAt, type: "admin_action", detail: `${l.actor.fullName}: ${l.action} ${l.targetName ?? ""}`, entity: l.targetId ?? "" });
  }

  items.sort((a, b) => b.date.getTime() - a.date.getTime());
  return items.slice(0, limit);
}

// ─── Audit Logs ──────────────────────────────────────────────

export type LogFilter = {
  action?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
};

export async function getSuperAdminLogs(filters: LogFilter = {}) {
  const { action, search, dateFrom, dateTo, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (search) {
    where.OR = [
      { targetName: { contains: search, mode: "insensitive" } },
      { comment: { contains: search, mode: "insensitive" } },
    ];
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(dateTo) } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.superAdminLog.count({ where }),
    prisma.superAdminLog.findMany({
      where,
      include: { actor: { select: { fullName: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: logs, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function logSuperAdminAction(
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  targetName?: string,
  oldValue?: string,
  newValue?: string,
  comment?: string,
) {
  await prisma.superAdminLog.create({
    data: { actorId, action, targetType, targetId, targetName, oldValue, newValue, comment },
  });
}

// ─── Plans ───────────────────────────────────────────────────

export async function getPlans() {
  return prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
}

// ─── Super Admin Team ────────────────────────────────────────

const SA_ROLES_DATA = {
  owner: { label: "Propriétaire", description: "Accès total, peut gérer les autres admins" },
  admin: { label: "Administrateur", description: "Accès complet sauf gestion des admins" },
  viewer: { label: "Lecteur", description: "Consultation seule, aucune action" },
};

export type SARole = "owner" | "admin" | "viewer";

export async function getSARoles() {
  return SA_ROLES_DATA;
}

export async function listSuperAdmins() {
  return prisma.user.findMany({
    where: { isSuperAdmin: true },
    select: {
      id: true,
      email: true,
      fullName: true,
      superAdminRole: true,
      lastLoginAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addSuperAdmin(
  email: string,
  fullName: string,
  role: SARole,
  actorId: string,
) {
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    if (user.isSuperAdmin) throw new Error("Cet utilisateur est déjà super admin.");
    user = await prisma.user.update({
      where: { id: user.id },
      data: { isSuperAdmin: true, superAdminRole: role },
    });
  } else {
    throw new Error(
      "Cet email n'a pas de compte OControle. L'utilisateur doit d'abord créer un compte sur la plateforme, puis vous pourrez le promouvoir ici.",
    );
  }

  await logSuperAdminAction(actorId, "ADD_SUPER_ADMIN", "User", user.id, user.email, undefined, role, `Ajout de ${fullName} comme ${role}`);
  return user;
}

export async function removeSuperAdmin(userId: string, actorId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, superAdminRole: true } });
  if (!target) throw new Error("Utilisateur introuvable");
  if (target.superAdminRole === "owner") throw new Error("Impossible de retirer le propriétaire.");

  await prisma.user.update({
    where: { id: userId },
    data: { isSuperAdmin: false, superAdminRole: null },
  });

  await logSuperAdminAction(actorId, "REMOVE_SUPER_ADMIN", "User", userId, target.email, target.superAdminRole ?? "admin", "removed");
}

export async function updateSuperAdminRole(userId: string, newRole: SARole, actorId: string) {
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, superAdminRole: true } });
  if (!target) throw new Error("Utilisateur introuvable");
  if (target.superAdminRole === "owner" && newRole !== "owner") throw new Error("Impossible de rétrograder le propriétaire.");

  await prisma.user.update({
    where: { id: userId },
    data: { superAdminRole: newRole },
  });

  await logSuperAdminAction(actorId, "CHANGE_ADMIN_ROLE", "User", userId, target.email, target.superAdminRole ?? "—", newRole);
}

export async function isOwnerRole(role: string | null | undefined): Promise<boolean> {
  return role === "owner";
}
