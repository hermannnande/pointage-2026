"use server";

import type { BillingCycle } from "@prisma/client";

import { createClient } from "@/lib/supabase/server";
import * as sa from "@/services/super-admin.service";
import type { ActionResult } from "@/types";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ok = await sa.isSuperAdmin(user.id);
  if (!ok) throw new Error("Accès refusé");
  const adminUser = await sa.getSuperAdminUser(user.id);
  if (!adminUser) throw new Error("Utilisateur introuvable");
  return adminUser;
}

// ─── Dashboard ───────────────────────────────────────────────

export async function getDashboardKPIsAction() {
  await requireSuperAdmin();
  return sa.getDashboardKPIs();
}

export async function getRegistrationTrendAction(months = 6) {
  await requireSuperAdmin();
  return sa.getRegistrationTrend(months);
}

export async function getRevenueTrendAction(months = 6) {
  await requireSuperAdmin();
  return sa.getRevenueTrend(months);
}

export async function getSubscriptionDistributionAction() {
  await requireSuperAdmin();
  return sa.getSubscriptionDistribution();
}

export async function getTopActiveCompaniesAction(limit = 10) {
  await requireSuperAdmin();
  return sa.getTopActiveCompanies(limit);
}

// ─── Companies ───────────────────────────────────────────────

export async function getCompaniesAction(filters: sa.CompanyFilter = {}) {
  await requireSuperAdmin();
  return sa.getCompanies(filters);
}

export async function getCompanyDetailAction(id: string) {
  await requireSuperAdmin();
  return sa.getCompanyDetail(id);
}

export async function suspendCompanyAction(companyId: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.suspendCompany(companyId, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function reactivateCompanyAction(companyId: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.reactivateCompany(companyId, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function extendTrialAction(companyId: string, days: number): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.extendTrial(companyId, days, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function changePlanAction(companyId: string, planSlug: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.changePlanManual(companyId, planSlug, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/**
 * Active ou reconduit manuellement un abonnement (paiement hors-Chariow).
 *
 * Réservé aux super-admins. Trace l'action dans les logs avec
 * la référence de paiement saisie.
 */
export async function activateSubscriptionAction(input: {
  companyId: string;
  planSlug: string;
  billingCycle: BillingCycle;
  durationMonths?: number;
  amount?: number;
  currency?: string;
  paymentRef?: string;
  note?: string;
}): Promise<
  ActionResult<{ periodEnd: string; planName: string; months: number }>
> {
  try {
    const admin = await requireSuperAdmin();
    const result = await sa.activateSubscriptionManually({
      ...input,
      actorId: admin.id,
    });
    return {
      success: true,
      data: {
        periodEnd: result.periodEnd.toISOString(),
        planName: result.plan.name,
        months: result.months,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function addNoteAction(companyId: string, content: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    await sa.addAdminNote(companyId, admin.id, content);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

// ─── Employees ───────────────────────────────────────────────

export async function getGlobalEmployeesAction(filters: sa.EmployeeFilter = {}) {
  await requireSuperAdmin();
  return sa.getGlobalEmployees(filters);
}

export async function getEmployeeGrowthAction() {
  await requireSuperAdmin();
  return sa.getEmployeeGrowthStats();
}

// ─── Subscriptions ───────────────────────────────────────────

export async function getSubscriptionsAction(filters: sa.SubFilter = {}) {
  await requireSuperAdmin();
  return sa.getSubscriptions(filters);
}

export async function getSubscriptionKPIsAction() {
  await requireSuperAdmin();
  return sa.getSubscriptionKPIs();
}

// ─── Transactions ────────────────────────────────────────────

export async function getTransactionsAction(filters: sa.TxFilter = {}) {
  await requireSuperAdmin();
  return sa.getTransactions(filters);
}

export async function getTransactionKPIsAction() {
  await requireSuperAdmin();
  return sa.getTransactionKPIs();
}

// ─── Billing Debug (Chariow) ─────────────────────────────────

export interface ChariowSaleRow {
  saleId: string;
  status: string;
  paymentStatus?: string;
  amount: number;
  currency: string;
  productName: string;
  planSlug?: string;
  billingCycle?: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerPhone?: string;
  customerCountry?: string;
  checkoutUrl?: string;
  createdAt?: string | null;
  completedAt?: string | null;
  abandonedAt?: string | null;
  failedAt?: string | null;
  // Données croisées avec notre DB
  companyId?: string;
  companyName?: string;
  hasLocalSuccess: boolean;
  hasLocalFailure: boolean;
  hasLocalInitiated: boolean;
}

export async function getChariowSalesAction(limit = 100): Promise<{
  sales: ChariowSaleRow[];
  kpis: {
    total: number;
    completed: number;
    abandoned: number;
    failed: number;
    awaitingPayment: number;
    revenueTotal: number;
    blockedNeedingHelp: number;
  };
}> {
  await requireSuperAdmin();

  const chariowService = await import("@/services/chariow.service");
  const { prisma } = await import("@/lib/prisma/client");

  const sales = await chariowService.listSales(limit).catch((err) => {
    console.error("listSales failed", err);
    return [] as Awaited<ReturnType<typeof chariowService.listSales>>;
  });

  const saleIds = sales.map((s) => s.id).filter(Boolean);
  const companyIds = Array.from(
    new Set(sales.map((s) => s.custom_metadata?.company_id).filter(Boolean) as string[]),
  );

  const [events, companies] = await Promise.all([
    saleIds.length
      ? prisma.billingEvent.findMany({
          where: { chariowSaleId: { in: saleIds } },
          select: { chariowSaleId: true, type: true },
        })
      : Promise.resolve([]),
    companyIds.length
      ? prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const eventsBySale = new Map<string, Set<string>>();
  for (const ev of events) {
    if (!ev.chariowSaleId) continue;
    if (!eventsBySale.has(ev.chariowSaleId)) {
      eventsBySale.set(ev.chariowSaleId, new Set());
    }
    eventsBySale.get(ev.chariowSaleId)!.add(ev.type);
  }
  const companyById = new Map(companies.map((c) => [c.id, c.name]));

  const rows: ChariowSaleRow[] = sales.map((s) => {
    const types = eventsBySale.get(s.id) ?? new Set<string>();
    const companyId = s.custom_metadata?.company_id;
    return {
      saleId: s.id,
      status: s.status,
      paymentStatus: s.payment?.status,
      amount: s.amount?.value ?? 0,
      currency: s.amount?.currency ?? "XOF",
      productName: s.product?.name ?? s.custom_metadata?.plan_slug ?? "—",
      planSlug: s.custom_metadata?.plan_slug,
      billingCycle: s.custom_metadata?.billing_cycle,
      customerEmail: s.customer?.email,
      customerFirstName: s.customer?.first_name,
      customerLastName: s.customer?.last_name,
      customerPhone: s.customer?.phone,
      customerCountry: s.customer?.country,
      checkoutUrl: s.checkout?.url ?? s.payment?.checkout_url,
      createdAt: s.created_at,
      completedAt: s.completed_at,
      abandonedAt: s.abandoned_at,
      failedAt: s.failed_at,
      companyId,
      companyName: companyId ? companyById.get(companyId) : undefined,
      hasLocalSuccess: types.has("payment_success"),
      hasLocalFailure: types.has("payment_failed"),
      hasLocalInitiated: types.has("payment_initiated"),
    };
  });

  const kpis = {
    total: rows.length,
    completed: rows.filter((r) => r.status === "completed").length,
    abandoned: rows.filter((r) => r.status === "abandoned" || r.abandonedAt).length,
    failed: rows.filter((r) => r.status === "failed" || r.failedAt).length,
    awaitingPayment: rows.filter((r) => r.status === "awaiting_payment").length,
    revenueTotal: rows
      .filter((r) => r.status === "completed")
      .reduce((sum, r) => sum + r.amount, 0),
    // Sales bloquées : init local mais jamais finalisées côté Chariow OU paiement KO
    blockedNeedingHelp: rows.filter(
      (r) =>
        r.status !== "completed" &&
        (r.status === "abandoned" ||
          r.status === "failed" ||
          r.status === "awaiting_payment" ||
          r.abandonedAt ||
          r.failedAt),
    ).length,
  };

  return { sales: rows, kpis };
}

export async function resyncChariowSaleAction(
  saleId: string,
): Promise<ActionResult<{ status: string }>> {
  try {
    await requireSuperAdmin();
    const chariowService = await import("@/services/chariow.service");
    const billingService = await import("@/services/billing.service");

    const sale = await chariowService.getSale(saleId);
    const meta = sale.custom_metadata ?? {};
    const companyId = meta.company_id;
    if (!companyId) {
      return { success: false, error: "Sale sans company_id (pas créée par OControle)" };
    }

    const isSuccess = sale.status === "completed" || sale.payment?.status === "success";
    const isFailed = sale.status === "failed" || sale.payment?.status === "failed";

    if (isSuccess) {
      const billingCycle =
        meta.billing_cycle === "YEARLY" || meta.billing_cycle === "MONTHLY"
          ? meta.billing_cycle
          : undefined;
      await billingService.handlePaymentSuccess(
        companyId,
        sale.amount?.value ?? 0,
        sale.id,
        {
          planId: meta.plan_id,
          planSlug: meta.plan_slug,
          billingCycle: billingCycle as "MONTHLY" | "YEARLY" | undefined,
        },
      );
      return { success: true, data: { status: "activated" } };
    }

    if (isFailed) {
      await billingService.handlePaymentFailed(companyId, sale.id);
      return { success: true, data: { status: "marked_failed" } };
    }

    return { success: true, data: { status: sale.status } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

// ─── Trials ──────────────────────────────────────────────────

export async function getTrialsAction(filters: sa.TrialFilter = {}) {
  await requireSuperAdmin();
  return sa.getTrials(filters);
}

// ─── Activity ────────────────────────────────────────────────

export async function getRecentActivityAction(limit = 30) {
  await requireSuperAdmin();
  return sa.getRecentActivity(limit);
}

// ─── Usage & Engagement ─────────────────────────────────────

export async function getUsageOverviewAction() {
  await requireSuperAdmin();
  return sa.getUsageOverview();
}

export async function getDailyActivityTrendAction(days = 30) {
  await requireSuperAdmin();
  return sa.getDailyActivityTrend(days);
}

export async function getActivityHeatmapAction() {
  await requireSuperAdmin();
  return sa.getActivityHeatmap();
}

export async function getOnboardingFunnelAction(days = 30) {
  await requireSuperAdmin();
  return sa.getOnboardingFunnel(days);
}

export async function getCompanyEngagementAction(limit = 100) {
  await requireSuperAdmin();
  return sa.getCompanyEngagement(limit);
}

export async function getDormantCompaniesAction(daysSilent = 7, limit = 30) {
  await requireSuperAdmin();
  return sa.getDormantCompanies(daysSilent, limit);
}

export async function getUsersActivityAction(limit = 30) {
  await requireSuperAdmin();
  return sa.getUsersActivity(limit);
}

// ─── Logs ────────────────────────────────────────────────────

export async function getSuperAdminLogsAction(filters: sa.LogFilter = {}) {
  await requireSuperAdmin();
  return sa.getSuperAdminLogs(filters);
}

// ─── Plans ───────────────────────────────────────────────────

export async function getPlansAction() {
  await requireSuperAdmin();
  return sa.getPlans();
}

// ─── Team ────────────────────────────────────────────────────

export async function listSuperAdminsAction() {
  await requireSuperAdmin();
  return sa.listSuperAdmins();
}

export async function addSuperAdminAction(email: string, fullName: string, role: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    if (!(await sa.isOwnerRole(admin.superAdminRole))) return { success: false, error: "Seul le propriétaire peut ajouter des admins." };
    await sa.addSuperAdmin(email, fullName, role as sa.SARole, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function removeSuperAdminAction(userId: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    if (!(await sa.isOwnerRole(admin.superAdminRole))) return { success: false, error: "Seul le propriétaire peut retirer des admins." };
    await sa.removeSuperAdmin(userId, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function updateSuperAdminRoleAction(userId: string, newRole: string): Promise<ActionResult> {
  try {
    const admin = await requireSuperAdmin();
    if (!(await sa.isOwnerRole(admin.superAdminRole))) return { success: false, error: "Seul le propriétaire peut changer les rôles." };
    await sa.updateSuperAdminRole(userId, newRole as sa.SARole, admin.id);
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function getCurrentAdminRoleAction(): Promise<string | null> {
  const admin = await requireSuperAdmin();
  return admin.superAdminRole;
}
