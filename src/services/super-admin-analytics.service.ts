"use server";

import { prisma } from "@/lib/prisma/client";

// ============================================================
// SUPER ADMIN — ANALYTICS V2
// ============================================================
// Statistiques par période (jour / semaine / mois / trimestre / année)
// avec comparaison automatique vs période précédente, analyse des
// inscriptions bloquées dans l'onboarding, et diagnostic des échecs
// de paiement. Alimente le nouveau dashboard super-admin.

// ─── Périodes ────────────────────────────────────────────────

export type StatPeriod = "today" | "7d" | "30d" | "90d" | "12m";

type Window = { start: Date; end: Date };

function periodWindows(period: StatPeriod): { current: Window; previous: Window } {
  const now = new Date();

  if (period === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    return {
      current: { start, end: now },
      previous: { start: prevStart, end: start },
    };
  }

  const daysMap: Record<Exclude<StatPeriod, "today">, number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "12m": 365,
  };
  const days = daysMap[period];
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - days);
  return {
    current: { start, end: now },
    previous: { start: prevStart, end: start },
  };
}

/** Variation en % vs période précédente. null si non calculable (base 0). */
function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return Math.round(((current - previous) / previous) * 100);
}

// ─── KPIs par période avec comparaison ──────────────────────

export type PeriodMetric = {
  current: number;
  previous: number;
  delta: number | null; // % vs période précédente, null = pas de base
};

async function countMetrics(w: Window) {
  const [
    companies,
    employees,
    clockings,
    activeCompaniesRows,
    appConnections,
    appUsersRows,
    revenue,
    paymentsSuccess,
    paymentsFailed,
    checkoutsStarted,
    ownerLogins,
  ] = await Promise.all([
    prisma.company.count({ where: { createdAt: { gte: w.start, lt: w.end } } }),
    prisma.employee.count({ where: { createdAt: { gte: w.start, lt: w.end } } }),
    prisma.attendanceRecord.count({ where: { date: { gte: w.start, lt: w.end } } }),
    prisma.attendanceRecord.findMany({
      where: { date: { gte: w.start, lt: w.end } },
      select: { companyId: true },
      distinct: ["companyId"],
    }),
    prisma.appConnectionLog.count({ where: { createdAt: { gte: w.start, lt: w.end } } }),
    prisma.appConnectionLog.findMany({
      where: { createdAt: { gte: w.start, lt: w.end } },
      select: { userId: true, employeeId: true },
      distinct: ["userId", "employeeId"],
    }),
    prisma.billingEvent.aggregate({
      where: {
        createdAt: { gte: w.start, lt: w.end },
        type: { in: ["payment_success", "manual_activation"] },
        amount: { not: null },
      },
      _sum: { amount: true },
    }),
    prisma.billingEvent.count({
      where: { createdAt: { gte: w.start, lt: w.end }, type: { in: ["payment_success", "manual_activation"] } },
    }),
    prisma.billingEvent.count({
      where: { createdAt: { gte: w.start, lt: w.end }, type: "payment_failed" },
    }),
    prisma.billingEvent.count({
      where: { createdAt: { gte: w.start, lt: w.end }, type: "payment_initiated" },
    }),
    prisma.user.count({ where: { lastLoginAt: { gte: w.start, lt: w.end } } }),
  ]);

  return {
    companies,
    employees,
    clockings,
    activeCompanies: activeCompaniesRows.length,
    appConnections,
    appUsers: appUsersRows.length,
    revenue: revenue._sum.amount ?? 0,
    paymentsSuccess,
    paymentsFailed,
    checkoutsStarted,
    ownerLogins,
  };
}

export async function getPeriodStats(period: StatPeriod) {
  const { current, previous } = periodWindows(period);
  const [cur, prev] = await Promise.all([countMetrics(current), countMetrics(previous)]);

  const metric = (key: keyof Awaited<ReturnType<typeof countMetrics>>): PeriodMetric => ({
    current: cur[key],
    previous: prev[key],
    delta: deltaPct(cur[key], prev[key]),
  });

  return {
    period,
    from: current.start,
    to: current.end,
    companies: metric("companies"),
    employees: metric("employees"),
    clockings: metric("clockings"),
    activeCompanies: metric("activeCompanies"),
    appConnections: metric("appConnections"),
    appUsers: metric("appUsers"),
    revenue: metric("revenue"),
    paymentsSuccess: metric("paymentsSuccess"),
    paymentsFailed: metric("paymentsFailed"),
    checkoutsStarted: metric("checkoutsStarted"),
    ownerLogins: metric("ownerLogins"),
  };
}

// ─── Tendance multi-métriques granulaire ─────────────────────
// today → par heure ; 7d/30d → par jour ; 90d → par semaine ; 12m → par mois.

export type TrendBucket = {
  label: string;
  inscriptions: number;
  pointages: number;
  connexionsApp: number;
  revenus: number;
  echecs: number;
};

function bucketKey(d: Date, period: StatPeriod): string {
  if (period === "today") return `${String(d.getHours()).padStart(2, "0")}h`;
  if (period === "90d") {
    // Lundi de la semaine ISO
    const monday = new Date(d);
    const day = monday.getDay() || 7;
    monday.setDate(monday.getDate() - day + 1);
    return monday.toISOString().slice(0, 10);
  }
  if (period === "12m") return d.toISOString().slice(0, 7);
  return d.toISOString().slice(0, 10);
}

function buildBuckets(period: StatPeriod, start: Date): Map<string, TrendBucket> {
  const buckets = new Map<string, TrendBucket>();
  const mk = (label: string): TrendBucket => ({
    label,
    inscriptions: 0,
    pointages: 0,
    connexionsApp: 0,
    revenus: 0,
    echecs: 0,
  });

  if (period === "today") {
    for (let h = 0; h < 24; h++) {
      const label = `${String(h).padStart(2, "0")}h`;
      buckets.set(label, mk(label));
    }
    return buckets;
  }

  const now = new Date();
  if (period === "12m") {
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    while (d <= now) {
      const key = d.toISOString().slice(0, 7);
      buckets.set(key, mk(key));
      d.setMonth(d.getMonth() + 1);
    }
    return buckets;
  }

  const stepDays = period === "90d" ? 7 : 1;
  const d = new Date(start);
  d.setHours(0, 0, 0, 0);
  if (period === "90d") {
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - day + 1);
  }
  while (d <= now) {
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, mk(key));
    d.setDate(d.getDate() + stepDays);
  }
  return buckets;
}

export async function getMultiTrend(period: StatPeriod): Promise<TrendBucket[]> {
  const { current } = periodWindows(period);
  const buckets = buildBuckets(period, current.start);

  const [companies, records, appLogs, billing] = await Promise.all([
    prisma.company.findMany({
      where: { createdAt: { gte: current.start } },
      select: { createdAt: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { date: { gte: current.start } },
      select: { date: true },
    }),
    prisma.appConnectionLog.findMany({
      where: { createdAt: { gte: current.start } },
      select: { createdAt: true },
    }),
    prisma.billingEvent.findMany({
      where: {
        createdAt: { gte: current.start },
        type: { in: ["payment_success", "manual_activation", "payment_failed"] },
      },
      select: { createdAt: true, type: true, amount: true },
    }),
  ]);

  const add = (d: Date, fn: (b: TrendBucket) => void) => {
    const b = buckets.get(bucketKey(d, period));
    if (b) fn(b);
  };

  for (const c of companies) add(c.createdAt, (b) => b.inscriptions++);
  for (const r of records) add(r.date, (b) => b.pointages++);
  for (const l of appLogs) add(l.createdAt, (b) => b.connexionsApp++);
  for (const e of billing) {
    add(e.createdAt, (b) => {
      if (e.type === "payment_failed") b.echecs++;
      else b.revenus += e.amount ?? 0;
    });
  }

  return Array.from(buckets.values());
}

// ─── Inscriptions & blocages onboarding ──────────────────────
// Pour chaque entreprise inscrite : à quelle étape elle est bloquée.
//   SITE      → inscrite mais aucun lieu créé
//   EMPLOYEE  → lieu créé mais aucun employé
//   CLOCKING  → employés créés mais aucun pointage
//   PAYMENT   → utilise l'app mais n'a jamais payé (essai expiré / impayé)
//   TRIAL     → en essai actif, progresse normalement
//   ACTIVE    → abonnement payant actif (convertie)

export type OnboardingStage = "SITE" | "EMPLOYEE" | "CLOCKING" | "PAYMENT" | "TRIAL" | "ACTIVE";

export type SignupRow = {
  id: string;
  name: string;
  country: string;
  city: string | null;
  createdAt: Date;
  daysSinceSignup: number;
  stage: OnboardingStage;
  isBlocked: boolean;
  sitesCount: number;
  employeesCount: number;
  clockingsTotal: number;
  lastClockAt: Date | null;
  subStatus: string | null;
  planName: string | null;
  trialEndsAt: Date | null;
  trialDaysLeft: number | null;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  ownerLastLoginAt: Date | null;
  appConnected: boolean;
  isActive: boolean;
};

export async function getSignupAnalysis(days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const now = new Date();

  const companies = await prisma.company.findMany({
    where: { createdAt: { gte: since } },
    select: {
      id: true,
      name: true,
      country: true,
      city: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      trialEndsAt: true,
      subscription: {
        select: { status: true, trialEndsAt: true, plan: { select: { name: true } } },
      },
      _count: { select: { sites: true, employees: true } },
      memberships: {
        where: { isOwner: true },
        take: 1,
        select: {
          user: { select: { fullName: true, email: true, phone: true, lastLoginAt: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const ids = companies.map((c) => c.id);

  const [clockStats, appRows] = await Promise.all([
    ids.length
      ? prisma.attendanceRecord.groupBy({
          by: ["companyId"],
          where: { companyId: { in: ids } },
          _count: { id: true },
          _max: { date: true },
        })
      : Promise.resolve([] as { companyId: string; _count: { id: number }; _max: { date: Date | null } }[]),
    ids.length
      ? prisma.appConnectionLog.findMany({
          where: { companyId: { in: ids } },
          select: { companyId: true },
          distinct: ["companyId"],
        })
      : Promise.resolve([] as { companyId: string }[]),
  ]);

  const clockMap = new Map(clockStats.map((r) => [r.companyId, { count: r._count.id, last: r._max.date }]));
  const appSet = new Set(appRows.map((r) => r.companyId));

  const rows: SignupRow[] = companies.map((c) => {
    const clock = clockMap.get(c.id);
    const clockings = clock?.count ?? 0;
    const subStatus = c.subscription?.status ?? null;
    const trialEnd = c.subscription?.trialEndsAt ?? c.trialEndsAt ?? null;
    const trialDaysLeft = trialEnd
      ? Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000)
      : null;

    let stage: OnboardingStage;
    if (subStatus === "ACTIVE") stage = "ACTIVE";
    else if (c._count.sites === 0) stage = "SITE";
    else if (c._count.employees === 0) stage = "EMPLOYEE";
    else if (clockings === 0) stage = "CLOCKING";
    else if (subStatus === "TRIALING" && trialDaysLeft != null && trialDaysLeft > 0) stage = "TRIAL";
    else stage = "PAYMENT";

    const owner = c.memberships[0]?.user;
    return {
      id: c.id,
      name: c.name,
      country: c.country,
      city: c.city,
      createdAt: c.createdAt,
      daysSinceSignup: Math.floor((now.getTime() - c.createdAt.getTime()) / 86_400_000),
      stage,
      isBlocked: stage !== "ACTIVE" && stage !== "TRIAL",
      sitesCount: c._count.sites,
      employeesCount: c._count.employees,
      clockingsTotal: clockings,
      lastClockAt: clock?.last ?? null,
      subStatus,
      planName: c.subscription?.plan?.name ?? null,
      trialEndsAt: trialEnd,
      trialDaysLeft,
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? c.email ?? null,
      ownerPhone: owner?.phone ?? c.phone ?? null,
      ownerLastLoginAt: owner?.lastLoginAt ?? null,
      appConnected: appSet.has(c.id),
      isActive: c.isActive,
    };
  });

  // Funnel : combien ont franchi chaque étape.
  const total = rows.length;
  const passedSite = rows.filter((r) => r.sitesCount > 0).length;
  const passedEmployee = rows.filter((r) => r.employeesCount > 0).length;
  const passedClocking = rows.filter((r) => r.clockingsTotal > 0).length;
  const converted = rows.filter((r) => r.stage === "ACTIVE").length;

  const funnel = [
    { step: "Inscription", count: total, pct: 100 },
    { step: "Lieu créé", count: passedSite, pct: total ? Math.round((passedSite / total) * 100) : 0 },
    { step: "Employé ajouté", count: passedEmployee, pct: total ? Math.round((passedEmployee / total) * 100) : 0 },
    { step: "Premier pointage", count: passedClocking, pct: total ? Math.round((passedClocking / total) * 100) : 0 },
    { step: "Abonnement payé", count: converted, pct: total ? Math.round((converted / total) * 100) : 0 },
  ];

  const blockedBreakdown = (["SITE", "EMPLOYEE", "CLOCKING", "PAYMENT"] as const).map((stage) => ({
    stage,
    count: rows.filter((r) => r.stage === stage).length,
  }));

  return {
    days,
    total,
    converted,
    inTrial: rows.filter((r) => r.stage === "TRIAL").length,
    blocked: rows.filter((r) => r.isBlocked).length,
    funnel,
    blockedBreakdown,
    companies: rows,
  };
}

// ─── Analyse des paiements & échecs ──────────────────────────
// Croise les BillingEvents locaux (initiated / success / failed) pour
// expliquer pourquoi les paiements échouent :
//   OPERATOR_FAILED     → webhook sale.failed reçu (échec côté opérateur mobile money)
//   CHECKOUT_ABANDONED  → checkout démarré mais jamais complété
//   RENEWAL_UNPAID      → abonnement passé PAST_DUE (renouvellement non payé)
//   TRIAL_NOT_CONVERTED → essai terminé sans aucune tentative de paiement

export type PaymentIssueReason =
  | "OPERATOR_FAILED"
  | "CHECKOUT_ABANDONED"
  | "RENEWAL_UNPAID"
  | "TRIAL_NOT_CONVERTED";

export type PaymentIssueRow = {
  id: string;
  reason: PaymentIssueReason;
  companyId: string;
  companyName: string;
  ownerName: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  planName: string | null;
  billingCycle: string | null;
  amount: number | null;
  currency: string;
  chariowSaleId: string | null;
  occurredAt: Date;
};

type BillingMeta = {
  planName?: string;
  planSlug?: string;
  billingCycle?: string;
} | null;

export async function getPaymentAnalysis(days = 90) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);
  const oneHourAgo = new Date(Date.now() - 3_600_000);
  const now = new Date();

  const [events, plans, pastDueSubs, expiredTrials] = await Promise.all([
    prisma.billingEvent.findMany({
      where: {
        createdAt: { gte: since },
        type: { in: ["payment_initiated", "payment_success", "payment_failed", "manual_activation"] },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            memberships: {
              where: { isOwner: true },
              take: 1,
              select: { user: { select: { fullName: true, email: true, phone: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({ select: { slug: true, name: true, priceMonthly: true, priceYearly: true } }),
    prisma.subscription.findMany({
      where: { status: { in: ["PAST_DUE", "GRACE_PERIOD"] } },
      include: {
        plan: { select: { name: true } },
        company: {
          select: {
            id: true,
            name: true,
            memberships: {
              where: { isOwner: true },
              take: 1,
              select: { user: { select: { fullName: true, email: true, phone: true } } },
            },
          },
        },
      },
    }),
    prisma.subscription.findMany({
      where: {
        OR: [
          { status: "EXPIRED" },
          { status: "TRIALING", trialEndsAt: { lt: now } },
        ],
      },
      include: {
        plan: { select: { name: true } },
        company: {
          select: {
            id: true,
            name: true,
            memberships: {
              where: { isOwner: true },
              take: 1,
              select: { user: { select: { fullName: true, email: true, phone: true } } },
            },
          },
        },
      },
    }),
  ]);

  const planMap = new Map(plans.map((p) => [p.slug, p]));

  // Ventes complétées / échouées (pour détecter les checkouts abandonnés).
  const settledSaleIds = new Set(
    events
      .filter((e) => e.type !== "payment_initiated" && e.chariowSaleId)
      .map((e) => e.chariowSaleId as string),
  );

  const successEvents = events.filter(
    (e) => e.type === "payment_success" || e.type === "manual_activation",
  );
  const failedEvents = events.filter((e) => e.type === "payment_failed");
  const initiatedEvents = events.filter((e) => e.type === "payment_initiated");

  // Un checkout est "abandonné" s'il a plus d'1h et qu'aucun événement
  // success/failed n'existe pour la même vente Chariow.
  const abandonedEvents = initiatedEvents.filter(
    (e) =>
      e.createdAt < oneHourAgo &&
      (!e.chariowSaleId || !settledSaleIds.has(e.chariowSaleId)),
  );

  const ownerOf = (company: (typeof events)[number]["company"]) =>
    company.memberships[0]?.user ?? null;

  const estimateAmount = (meta: BillingMeta): number | null => {
    if (!meta?.planSlug) return null;
    const plan = planMap.get(meta.planSlug);
    if (!plan) return null;
    return meta.billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
  };

  const issues: PaymentIssueRow[] = [];

  for (const e of failedEvents) {
    const meta = e.metadata as BillingMeta;
    const owner = ownerOf(e.company);
    issues.push({
      id: `fail_${e.id}`,
      reason: "OPERATOR_FAILED",
      companyId: e.company.id,
      companyName: e.company.name,
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
      planName: meta?.planName ?? null,
      billingCycle: meta?.billingCycle ?? null,
      amount: e.amount ?? estimateAmount(meta),
      currency: e.currency ?? "XOF",
      chariowSaleId: e.chariowSaleId,
      occurredAt: e.createdAt,
    });
  }

  for (const e of abandonedEvents) {
    const meta = e.metadata as BillingMeta;
    const owner = ownerOf(e.company);
    issues.push({
      id: `aband_${e.id}`,
      reason: "CHECKOUT_ABANDONED",
      companyId: e.company.id,
      companyName: e.company.name,
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
      planName: meta?.planName ?? null,
      billingCycle: meta?.billingCycle ?? null,
      amount: e.amount ?? estimateAmount(meta),
      currency: e.currency ?? "XOF",
      chariowSaleId: e.chariowSaleId,
      occurredAt: e.createdAt,
    });
  }

  for (const s of pastDueSubs) {
    const owner = s.company.memberships[0]?.user ?? null;
    issues.push({
      id: `pastdue_${s.id}`,
      reason: "RENEWAL_UNPAID",
      companyId: s.company.id,
      companyName: s.company.name,
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
      planName: s.plan?.name ?? null,
      billingCycle: s.billingCycle,
      amount: null,
      currency: "XOF",
      chariowSaleId: null,
      occurredAt: s.currentPeriodEnd,
    });
  }

  for (const s of expiredTrials) {
    const owner = s.company.memberships[0]?.user ?? null;
    issues.push({
      id: `trial_${s.id}`,
      reason: "TRIAL_NOT_CONVERTED",
      companyId: s.company.id,
      companyName: s.company.name,
      ownerName: owner?.fullName ?? null,
      ownerEmail: owner?.email ?? null,
      ownerPhone: owner?.phone ?? null,
      planName: s.plan?.name ?? null,
      billingCycle: s.billingCycle,
      amount: null,
      currency: "XOF",
      chariowSaleId: null,
      occurredAt: s.trialEndsAt ?? s.currentPeriodEnd,
    });
  }

  issues.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  // KPIs 30 jours
  const success30 = successEvents.filter((e) => e.createdAt >= since30).length;
  const failed30 = failedEvents.filter((e) => e.createdAt >= since30).length;
  const abandoned30 = abandonedEvents.filter((e) => e.createdAt >= since30).length;
  const initiated30 = initiatedEvents.filter((e) => e.createdAt >= since30).length;
  const attempts30 = success30 + failed30;
  const revenue30 = successEvents
    .filter((e) => e.createdAt >= since30)
    .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  const lostRevenue30 = issues
    .filter(
      (i) =>
        i.occurredAt >= since30 &&
        (i.reason === "OPERATOR_FAILED" || i.reason === "CHECKOUT_ABANDONED") &&
        i.amount != null,
    )
    .reduce((sum, i) => sum + (i.amount ?? 0), 0);

  // Tendance 30 jours : succès vs échecs vs checkouts démarrés
  const trendMap = new Map<string, { day: string; succes: number; echecs: number; demarres: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, { day: key, succes: 0, echecs: 0, demarres: 0 });
  }
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    const b = trendMap.get(key);
    if (!b) continue;
    if (e.type === "payment_success" || e.type === "manual_activation") b.succes++;
    else if (e.type === "payment_failed") b.echecs++;
    else if (e.type === "payment_initiated") b.demarres++;
  }

  // Répartition des raisons
  const reasonBreakdown = (
    ["OPERATOR_FAILED", "CHECKOUT_ABANDONED", "RENEWAL_UNPAID", "TRIAL_NOT_CONVERTED"] as const
  ).map((reason) => ({
    reason,
    count: issues.filter((i) => i.reason === reason).length,
  }));

  // Entreprises avec échecs répétés et aucun paiement réussi → prioritaires
  const successCompanyIds = new Set(successEvents.map((e) => e.company.id));
  const failCounts = new Map<string, { row: PaymentIssueRow; count: number }>();
  for (const i of issues) {
    if (i.reason !== "OPERATOR_FAILED" && i.reason !== "CHECKOUT_ABANDONED") continue;
    if (successCompanyIds.has(i.companyId)) continue;
    const existing = failCounts.get(i.companyId);
    if (existing) existing.count++;
    else failCounts.set(i.companyId, { row: i, count: 1 });
  }
  const priorityCompanies = Array.from(failCounts.values())
    .filter((f) => f.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map((f) => ({ ...f.row, failureCount: f.count }));

  return {
    kpis: {
      success30,
      failed30,
      abandoned30,
      initiated30,
      failureRate: attempts30 > 0 ? Math.round((failed30 / attempts30) * 100) : 0,
      abandonRate: initiated30 > 0 ? Math.round((abandoned30 / initiated30) * 100) : 0,
      revenue30,
      lostRevenue30,
      pastDueCount: pastDueSubs.length,
      expiredTrialsCount: expiredTrials.length,
    },
    trend: Array.from(trendMap.values()),
    reasonBreakdown,
    issues: issues.slice(0, 100),
    priorityCompanies,
  };
}

// ─── Alertes dashboard ───────────────────────────────────────

export async function getDashboardAlerts() {
  const now = new Date();
  const in3Days = new Date(now);
  in3Days.setDate(in3Days.getDate() + 3);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const [failedPayments7d, pastDue, trialsExpiring, recentCompanies, clockedRows, recentActive] =
    await Promise.all([
      prisma.billingEvent.count({
        where: { type: "payment_failed", createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.subscription.count({ where: { status: { in: ["PAST_DUE", "GRACE_PERIOD"] } } }),
      prisma.subscription.count({
        where: { status: "TRIALING", trialEndsAt: { gte: now, lte: in3Days } },
      }),
      prisma.company.findMany({
        where: { createdAt: { lt: threeDaysAgo }, isActive: true },
        select: { id: true },
      }),
      prisma.attendanceRecord.findMany({
        select: { companyId: true },
        distinct: ["companyId"],
      }),
      prisma.attendanceRecord.findMany({
        where: { date: { gte: sevenDaysAgo } },
        select: { companyId: true },
        distinct: ["companyId"],
      }),
    ]);

  const clockedSet = new Set(clockedRows.map((r) => r.companyId));
  const stuckSignups = recentCompanies.filter((c) => !clockedSet.has(c.id)).length;

  // Dormantes : ont déjà pointé mais plus rien depuis 7 jours.
  const activeSet = new Set(recentActive.map((r) => r.companyId));
  const dormant = clockedRows.filter((r) => !activeSet.has(r.companyId)).length;

  return {
    failedPayments7d,
    pastDue,
    trialsExpiring3d: trialsExpiring,
    stuckSignups,
    dormantCompanies: dormant,
  };
}

// ─── Messages WhatsApp (WasenderAPI) ─────────────────────────
// Journal des messages automatiques envoyés : qui, quand, quel type,
// statut d'envoi. Alimente la page super-admin "Messages WhatsApp".

export type WhatsAppFilter = {
  type?: string;
  status?: "SENT" | "FAILED" | "PENDING";
  search?: string;
  page?: number;
  pageSize?: number;
};

export async function getWhatsAppMessages(filters: WhatsAppFilter = {}) {
  const { type, status, search, page = 1, pageSize = 30 } = filters;

  const where: Record<string, unknown> = {};
  if (type) where.type = type;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { phone: { contains: search } },
      { content: { contains: search, mode: "insensitive" } },
    ];
  }

  const [total, messages] = await Promise.all([
    prisma.whatsAppMessage.count({ where }),
    prisma.whatsAppMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Résolution des noms d'entreprise / utilisateur (pas de relation Prisma
  // sur ce modèle : companyId/userId sont volontairement de simples strings).
  const companyIds = [...new Set(messages.map((m) => m.companyId).filter((v): v is string => !!v))];
  const userIds = [...new Set(messages.map((m) => m.userId).filter((v): v is string => !!v))];

  const [companies, users] = await Promise.all([
    companyIds.length
      ? prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } })
      : Promise.resolve([] as { id: string; name: string }[]),
    userIds.length
      ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } })
      : Promise.resolve([] as { id: string; fullName: string }[]),
  ]);

  const companyMap = new Map(companies.map((c) => [c.id, c.name]));
  const userMap = new Map(users.map((u) => [u.id, u.fullName]));

  return {
    data: messages.map((m) => ({
      id: m.id,
      phone: m.phone,
      type: m.type,
      status: m.status,
      error: m.error,
      content: m.content,
      createdAt: m.createdAt,
      companyId: m.companyId,
      companyName: m.companyId ? (companyMap.get(m.companyId) ?? null) : null,
      userName: m.userId ? (userMap.get(m.userId) ?? null) : null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getWhatsAppKPIs() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since7 = new Date();
  since7.setDate(since7.getDate() - 7);
  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const [total, sentToday, sent7d, failed30d, byType, trendRows] = await Promise.all([
    prisma.whatsAppMessage.count(),
    prisma.whatsAppMessage.count({ where: { createdAt: { gte: today }, status: "SENT" } }),
    prisma.whatsAppMessage.count({ where: { createdAt: { gte: since7 }, status: "SENT" } }),
    prisma.whatsAppMessage.count({ where: { createdAt: { gte: since30 }, status: "FAILED" } }),
    prisma.whatsAppMessage.groupBy({
      by: ["type"],
      _count: { id: true },
    }),
    prisma.whatsAppMessage.findMany({
      where: { createdAt: { gte: since30 } },
      select: { createdAt: true, status: true },
    }),
  ]);

  // Tendance 30 jours : envoyés vs échoués par jour.
  const trendMap = new Map<string, { day: string; envoyes: number; echoues: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    trendMap.set(key, { day: key, envoyes: 0, echoues: 0 });
  }
  for (const r of trendRows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    const b = trendMap.get(key);
    if (!b) continue;
    if (r.status === "FAILED") b.echoues++;
    else b.envoyes++;
  }

  return {
    total,
    sentToday,
    sent7d,
    failed30d,
    byType: byType.map((t) => ({ type: t.type, count: t._count.id })),
    trend: Array.from(trendMap.values()),
  };
}

// ─── Flux temps réel (dernières activités croisées) ──────────

export type LiveFeedItem = {
  id: string;
  kind: "signup" | "payment_success" | "payment_failed" | "app_connection" | "admin_action";
  title: string;
  detail: string;
  at: Date;
};

export async function getLiveFeed(limit = 25) {
  const [companies, billing, appLogs, adminLogs] = await Promise.all([
    prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, name: true, country: true, createdAt: true },
    }),
    prisma.billingEvent.findMany({
      where: { type: { in: ["payment_success", "payment_failed", "manual_activation"] } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { company: { select: { name: true } } },
    }),
    prisma.appConnectionLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        company: { select: { name: true } },
        user: { select: { fullName: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.superAdminLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { actor: { select: { fullName: true } } },
    }),
  ]);

  const items: LiveFeedItem[] = [];

  for (const c of companies) {
    items.push({
      id: `c_${c.id}`,
      kind: "signup",
      title: "Nouvelle inscription",
      detail: `${c.name} (${c.country})`,
      at: c.createdAt,
    });
  }
  for (const e of billing) {
    const ok = e.type !== "payment_failed";
    items.push({
      id: `b_${e.id}`,
      kind: ok ? "payment_success" : "payment_failed",
      title: ok ? "Paiement reçu" : "Paiement échoué",
      detail: `${e.company.name}${e.amount ? ` — ${e.amount.toLocaleString("fr-FR")} ${e.currency ?? "XOF"}` : ""}`,
      at: e.createdAt,
    });
  }
  for (const l of appLogs) {
    const who =
      l.role === "OWNER"
        ? l.user?.fullName ?? "Propriétaire"
        : l.employee
          ? `${l.employee.firstName} ${l.employee.lastName}`
          : "Employé";
    items.push({
      id: `a_${l.id}`,
      kind: "app_connection",
      title: "Connexion app mobile",
      detail: `${who} · ${l.company.name}`,
      at: l.createdAt,
    });
  }
  for (const l of adminLogs) {
    items.push({
      id: `l_${l.id}`,
      kind: "admin_action",
      title: "Action admin",
      detail: `${l.actor.fullName}: ${l.action}${l.targetName ? ` → ${l.targetName}` : ""}`,
      at: l.createdAt,
    });
  }

  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.slice(0, limit);
}
