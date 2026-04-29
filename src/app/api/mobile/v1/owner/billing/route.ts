/**
 * GET /api/mobile/v1/owner/billing
 *
 * Snapshot complet de la facturation pour l'app mobile owner :
 *   - Subscription en cours (plan, statut, période)
 *   - Plans disponibles (pour l'écran "Changer de plan")
 *   - 10 dernières factures
 *   - 10 derniers événements de facturation
 *   - URLs pour ouvrir le checkout / facturation web
 *
 * Les actions complexes (checkout Chariow, paiement, annulation) restent
 * sur le web — l'app mobile ouvre simplement le navigateur sur la page
 * /dashboard/billing pour les opérations.
 */

import { prisma } from "@/lib/prisma/client";
import { checkSubscriptionStatus } from "@/services/billing.service";

import { ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  const { companyId } = auth.tenant;

  const status = await checkSubscriptionStatus(companyId);

  const [sub, plans, invoices, events, employeeCount, siteCount] =
    await Promise.all([
      prisma.subscription.findUnique({
        where: { companyId },
        include: { plan: true },
      }),
      prisma.plan.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          priceMonthly: true,
          priceYearly: true,
          currency: true,
          maxEmployees: true,
          maxSites: true,
          features: true,
          isPopular: true,
        },
      }),
      prisma.invoice.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.billingEvent.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.employee.count({ where: { companyId, isActive: true } }),
      prisma.site.count({ where: { companyId, isActive: true } }),
    ]);

  return ok({
    subscription: {
      isAccessible: status.isAccessible,
      status: status.status,
      remainingDays: status.daysRemaining,
      message: status.message,
      billingCycle: sub?.billingCycle ?? null,
      currentPeriodStart: sub?.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
      trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
      gracePeriodEndsAt: sub?.gracePeriodEndsAt?.toISOString() ?? null,
      cancelledAt: sub?.cancelledAt?.toISOString() ?? null,
    },
    currentPlan: sub?.plan
      ? {
          id: sub.plan.id,
          slug: sub.plan.slug,
          name: sub.plan.name,
          priceMonthly: sub.plan.priceMonthly,
          priceYearly: sub.plan.priceYearly,
          currency: sub.plan.currency,
          maxEmployees: sub.plan.maxEmployees,
          maxSites: sub.plan.maxSites,
        }
      : null,
    plans: plans.map((p) => ({
      ...p,
      features: Array.isArray(p.features) ? p.features : [],
    })),
    quotas: {
      employees: {
        used: employeeCount,
        max: sub?.plan?.maxEmployees ?? null,
      },
      sites: { used: siteCount, max: sub?.plan?.maxSites ?? null },
    },
    invoices: invoices.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount,
      currency: inv.currency,
      status: inv.status,
      periodStart: inv.periodStart.toISOString(),
      periodEnd: inv.periodEnd.toISOString(),
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
    })),
    events: events.map((e) => ({
      id: e.id,
      type: e.type,
      amount: e.amount,
      currency: e.currency,
      createdAt: e.createdAt.toISOString(),
    })),
    webLinks: {
      billing: "https://ocontrole.com/dashboard/billing",
      pricing: "https://ocontrole.com/pricing",
    },
  });
}

export const OPTIONS = preflight;
