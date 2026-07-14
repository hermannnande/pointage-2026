"use server";

import type { BillingCycle } from "@prisma/client";

import { createClient } from "@/lib/supabase/server";
import * as sa from "@/services/super-admin.service";
import { getWhatsAppNumber } from "@/lib/phone-country";
import { buildRelanceMessage } from "@/lib/relance-message";
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

// ─── Relance WhatsApp d'une transaction (page Transactions) ──────

export interface TransactionRelanceData {
  companyName?: string;
  /** Nom du propriétaire (destinataire). */
  ownerName?: string;
  /** Téléphone du propriétaire tel que stocké (affichage). */
  ownerPhone?: string;
  /** Téléphone du propriétaire au format international pour wa.me. */
  ownerWhatsapp?: string;
  /** Lien de paiement récupéré depuis Chariow (si disponible). */
  checkoutUrl?: string;
  /** Message de relance pré-rédigé (avec le lien). */
  message: string;
}

/**
 * Prépare une relance WhatsApp pour une transaction : résout le propriétaire de
 * l'entreprise (destinataire) et tente de récupérer le lien de paiement de la
 * vente Chariow, puis construit le message. Aucun envoi — c'est le super-admin
 * qui expédie via wa.me.
 */
export async function getTransactionRelanceAction(input: {
  companyId: string;
  chariowSaleId?: string | null;
}): Promise<ActionResult<TransactionRelanceData>> {
  try {
    await requireSuperAdmin();
    const { prisma } = await import("@/lib/prisma/client");

    const company = await prisma.company.findUnique({
      where: { id: input.companyId },
      select: {
        name: true,
        phone: true,
        country: true,
        memberships: {
          where: { isOwner: true, isActive: true },
          take: 1,
          select: { user: { select: { phone: true, fullName: true } } },
        },
        subscription: {
          select: { billingCycle: true, plan: { select: { name: true } } },
        },
      },
    });

    if (!company) {
      return { success: false, error: "Entreprise introuvable." };
    }

    const owner = company.memberships[0]?.user;
    const ownerPhoneRaw = owner?.phone ?? company.phone ?? undefined;
    const ownerName = owner?.fullName ?? undefined;
    const ownerWhatsapp = getWhatsAppNumber(ownerPhoneRaw, company.country);

    // Lien de paiement : on interroge Chariow pour récupérer le checkout de la
    // vente (best-effort ; si absent, le message renvoie vers la facturation).
    let checkoutUrl: string | undefined;
    if (input.chariowSaleId) {
      try {
        const chariow = await import("@/services/chariow.service");
        const sale = await chariow.getSale(input.chariowSaleId);
        checkoutUrl = sale.checkout?.url ?? sale.payment?.checkout_url ?? undefined;
      } catch (err) {
        console.error("getTransactionRelance: getSale a échoué", err);
      }
    }

    const message = buildRelanceMessage({
      firstName: ownerName?.split(/\s+/)[0],
      planLabel: company.subscription?.plan?.name,
      cycle: company.subscription?.billingCycle,
      checkoutUrl,
    });

    return {
      success: true,
      data: {
        companyName: company.name,
        ownerName,
        ownerPhone: ownerPhoneRaw,
        ownerWhatsapp,
        checkoutUrl,
        message,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la préparation de la relance.",
    };
  }
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
  /** Nom du propriétaire (destinataire de la relance). */
  ownerName?: string;
  /** Téléphone du propriétaire tel que stocké (affichage). */
  ownerPhone?: string;
  /** Téléphone du propriétaire au format international pour wa.me (chiffres seuls). */
  ownerWhatsapp?: string;
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
  const emails = Array.from(
    new Set(
      sales
        .map((s) => s.customer?.email?.trim().toLowerCase())
        .filter(Boolean) as string[],
    ),
  );

  const [events, companies, emailOwners] = await Promise.all([
    saleIds.length
      ? prisma.billingEvent.findMany({
          where: { chariowSaleId: { in: saleIds } },
          select: { chariowSaleId: true, type: true },
        })
      : Promise.resolve([]),
    companyIds.length
      ? prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: {
            id: true,
            name: true,
            phone: true,
            country: true,
            memberships: {
              where: { isOwner: true, isActive: true },
              take: 1,
              select: { user: { select: { phone: true, fullName: true } } },
            },
          },
        })
      : Promise.resolve([]),
    // Résolution du propriétaire via l'email du client Chariow (utile quand la
    // metadata company_id est absente — cas fréquent en mobile money RDC).
    emails.length
      ? prisma.membership.findMany({
          where: {
            isOwner: true,
            isActive: true,
            user: { email: { in: emails } },
          },
          select: {
            user: { select: { email: true, phone: true, fullName: true } },
            company: {
              select: { id: true, name: true, phone: true, country: true },
            },
          },
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

  // Infos propriétaire (destinataire de la relance) indexées par companyId,
  // + un index email → companyId pour les ventes sans metadata company_id.
  interface OwnerInfo {
    name: string;
    ownerName?: string;
    ownerPhoneRaw?: string;
    country?: string;
  }
  const ownerByCompanyId = new Map<string, OwnerInfo>();
  const companyIdByEmail = new Map<string, string>();

  for (const c of companies) {
    const owner = c.memberships[0]?.user;
    ownerByCompanyId.set(c.id, {
      name: c.name,
      ownerName: owner?.fullName ?? undefined,
      ownerPhoneRaw: owner?.phone ?? c.phone ?? undefined,
      country: c.country,
    });
  }
  for (const m of emailOwners) {
    if (!m.company) continue;
    const email = m.user?.email?.trim().toLowerCase();
    if (email) companyIdByEmail.set(email, m.company.id);
    if (!ownerByCompanyId.has(m.company.id)) {
      ownerByCompanyId.set(m.company.id, {
        name: m.company.name,
        ownerName: m.user?.fullName ?? undefined,
        ownerPhoneRaw: m.user?.phone ?? m.company.phone ?? undefined,
        country: m.company.country,
      });
    }
  }

  const rows: ChariowSaleRow[] = sales.map((s) => {
    const types = eventsBySale.get(s.id) ?? new Set<string>();
    const email = s.customer?.email?.trim().toLowerCase();
    const companyId =
      s.custom_metadata?.company_id ??
      (email ? companyIdByEmail.get(email) : undefined);
    const ownerInfo = companyId ? ownerByCompanyId.get(companyId) : undefined;
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
      companyName: ownerInfo?.name,
      ownerName: ownerInfo?.ownerName,
      ownerPhone: ownerInfo?.ownerPhoneRaw,
      ownerWhatsapp: getWhatsAppNumber(ownerInfo?.ownerPhoneRaw, ownerInfo?.country),
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
    let companyId = meta.company_id;

    // Fallback : si pas de company_id en metadata, on tente de retrouver la
    // company via l'email du customer (cas Chariow qui ne renvoie pas la
    // metadata dans certains flux).
    if (!companyId && sale.customer?.email) {
      const { prisma } = await import("@/lib/prisma/client");
      const ownerMembership = await prisma.membership.findFirst({
        where: {
          isOwner: true,
          isActive: true,
          user: {
            email: { equals: sale.customer.email, mode: "insensitive" },
          },
        },
        select: { companyId: true },
      });
      companyId = ownerMembership?.companyId;
    }

    if (!companyId) {
      return {
        success: false,
        error:
          "Impossible d'associer cette vente à une entreprise (ni company_id ni email reconnu).",
      };
    }

    const isSuccess = chariowService.isSalePaid(sale);
    const isFailed = chariowService.isSaleFailed(sale);

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

// ─── App mobile (APK) ───────────────────────────────────────

export async function getMobileAppOverviewAction() {
  await requireSuperAdmin();
  return sa.getMobileAppOverview();
}

export async function getAppConnectionTrendAction(days = 30) {
  await requireSuperAdmin();
  return sa.getAppConnectionTrend(days);
}

export async function getRecentAppConnectionsAction(limit = 50) {
  await requireSuperAdmin();
  return sa.getRecentAppConnections(limit);
}

export async function getCompanyAppAdoptionAction(limit = 100) {
  await requireSuperAdmin();
  return sa.getCompanyAppAdoption(limit);
}
