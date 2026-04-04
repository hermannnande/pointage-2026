import type { BillingCycle, SubStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { GRACE_PERIOD_DAYS } from "@/lib/constants";

export async function getSubscription(companyId: string) {
  return prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true },
  });
}

export async function getPlans() {
  return prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getPlanById(planId: string) {
  return prisma.plan.findUnique({ where: { id: planId } });
}

export async function getPlanBySlug(slug: string) {
  return prisma.plan.findUnique({ where: { slug } });
}

export async function recordPaymentInitiated(params: {
  companyId: string;
  chariowSaleId: string;
  planId: string;
  planName: string;
  planSlug: string;
  billingCycle: BillingCycle;
}) {
  const { companyId, chariowSaleId, planId, planName, planSlug, billingCycle } =
    params;

  return prisma.billingEvent.create({
    data: {
      companyId,
      type: "payment_initiated",
      chariowSaleId,
      chariowEventType: "checkout.initiated",
      metadata: {
        planId,
        planName,
        planSlug,
        billingCycle,
      },
    },
  });
}

export async function validatePlanChange(
  companyId: string,
  planId: string,
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan introuvable");

  const sub = await prisma.subscription.findUnique({ where: { companyId } });
  if (!sub) throw new Error("Aucun abonnement trouvé");

  const activeEmpCount = await prisma.employee.count({
    where: { companyId, isActive: true },
  });
  if (activeEmpCount > plan.maxEmployees) {
    throw new Error(
      `Ce plan est limité à ${plan.maxEmployees} employés. Vous en avez ${activeEmpCount} actifs.`,
    );
  }

  return plan;
}

export async function changePlan(
  companyId: string,
  planId: string,
  billingCycle: BillingCycle,
) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) throw new Error("Plan introuvable");

  const sub = await prisma.subscription.findUnique({ where: { companyId } });
  if (!sub) throw new Error("Aucun abonnement trouvé");

  const activeEmpCount = await prisma.employee.count({
    where: { companyId, isActive: true },
  });
  if (activeEmpCount > plan.maxEmployees) {
    throw new Error(
      `Ce plan est limité à ${plan.maxEmployees} employés. Vous en avez ${activeEmpCount} actifs.`,
    );
  }

  return prisma.subscription.update({
    where: { companyId },
    data: { planId, billingCycle },
  });
}

export async function activateSubscription(
  companyId: string,
  chariowSaleId: string,
  options?: { planId?: string; billingCycle?: BillingCycle },
) {
  const now = new Date();
  const sub = await prisma.subscription.findUnique({ where: { companyId } });
  if (!sub) throw new Error("Aucun abonnement");

  const effectiveBillingCycle = options?.billingCycle ?? sub.billingCycle;
  const monthsToAdd = effectiveBillingCycle === "YEARLY" ? 12 : 1;
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + monthsToAdd);

  return prisma.subscription.update({
    where: { companyId },
    data: {
      ...(options?.planId ? { planId: options.planId } : {}),
      ...(options?.billingCycle ? { billingCycle: options.billingCycle } : {}),
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      chariowSaleId,
      trialEndsAt: null,
      gracePeriodEndsAt: null,
    },
  });
}

export async function handlePaymentSuccess(
  companyId: string,
  amount: number,
  chariowSaleId: string,
  options?: { planId?: string; planSlug?: string; billingCycle?: BillingCycle },
) {
  const existingEvent = await prisma.billingEvent.findFirst({
    where: { companyId, type: "payment_success", chariowSaleId },
  });
  if (existingEvent) {
    const sub = await getSubscription(companyId);
    return sub;
  }

  let targetPlanId = options?.planId;
  if (!targetPlanId && options?.planSlug) {
    const plan = await prisma.plan.findUnique({ where: { slug: options.planSlug } });
    targetPlanId = plan?.id;
  }

  if (targetPlanId) {
    await validatePlanChange(companyId, targetPlanId);
  }

  const sub = await activateSubscription(companyId, chariowSaleId, {
    planId: targetPlanId,
    billingCycle: options?.billingCycle,
  });

  await prisma.billingEvent.create({
    data: {
      companyId,
      type: "payment_success",
      amount,
      chariowSaleId,
      chariowEventType: "successful.sale",
      metadata: options
        ? {
            planId: options.planId ?? null,
            planSlug: options.planSlug ?? null,
            billingCycle: options.billingCycle ?? null,
          }
        : undefined,
    },
  });

  const invoiceNumber = `INV-${companyId.slice(-6).toUpperCase()}-${Date.now()}`;
  await prisma.invoice.create({
    data: {
      companyId,
      number: invoiceNumber,
      amount,
      status: "PAID",
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      paidAt: new Date(),
      chariowSaleId,
    },
  });

  return sub;
}

export async function handlePaymentFailed(
  companyId: string,
  chariowSaleId?: string,
) {
  const now = new Date();
  const graceEnd = new Date(now);
  graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);

  await prisma.subscription.update({
    where: { companyId },
    data: {
      status: "PAST_DUE",
      gracePeriodEndsAt: graceEnd,
    },
  });

  await prisma.billingEvent.create({
    data: {
      companyId,
      type: "payment_failed",
      chariowSaleId: chariowSaleId ?? null,
      chariowEventType: "sale.failed",
    },
  });
}

export async function cancelSubscription(companyId: string) {
  return prisma.subscription.update({
    where: { companyId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
}

export async function checkSubscriptionStatus(companyId: string): Promise<{
  isAccessible: boolean;
  status: SubStatus;
  daysRemaining: number;
  message: string;
}> {
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true },
  });

  if (!sub) {
    return { isAccessible: false, status: "EXPIRED", daysRemaining: 0, message: "Aucun abonnement" };
  }

  const now = new Date();

  if (sub.status === "TRIALING") {
    const trialEnd = sub.trialEndsAt ?? sub.currentPeriodEnd;
    const remaining = Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000);
    if (remaining <= 0) {
      await prisma.subscription.update({
        where: { companyId },
        data: { status: "EXPIRED" },
      });
      return { isAccessible: false, status: "EXPIRED", daysRemaining: 0, message: "Essai gratuit expiré" };
    }
    return { isAccessible: true, status: "TRIALING", daysRemaining: remaining, message: `${remaining} jour(s) d'essai restant(s)` };
  }

  if (sub.status === "ACTIVE") {
    const remaining = Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000);
    if (remaining <= 0) {
      const graceEnd = new Date(sub.currentPeriodEnd);
      graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
      await prisma.subscription.update({
        where: { companyId },
        data: { status: "GRACE_PERIOD", gracePeriodEndsAt: graceEnd },
      });
      const graceRemaining = Math.ceil((graceEnd.getTime() - now.getTime()) / 86_400_000);
      return { isAccessible: true, status: "GRACE_PERIOD", daysRemaining: graceRemaining, message: `Renouvellement requis — ${graceRemaining} jour(s) restant(s)` };
    }
    return { isAccessible: true, status: "ACTIVE", daysRemaining: remaining, message: "Abonnement actif" };
  }

  if (sub.status === "GRACE_PERIOD" || sub.status === "PAST_DUE") {
    const graceEnd = sub.gracePeriodEndsAt ?? sub.currentPeriodEnd;
    const remaining = Math.ceil((graceEnd.getTime() - now.getTime()) / 86_400_000);
    if (remaining <= 0) {
      await prisma.subscription.update({
        where: { companyId },
        data: { status: "EXPIRED" },
      });
      return { isAccessible: false, status: "EXPIRED", daysRemaining: 0, message: "Abonnement expiré" };
    }
    return { isAccessible: true, status: sub.status, daysRemaining: remaining, message: `Paiement requis — ${remaining} jour(s) avant suspension` };
  }

  return { isAccessible: false, status: sub.status, daysRemaining: 0, message: "Abonnement inactif" };
}

export async function getQuotaStatus(companyId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true },
  });
  if (!sub) return null;

  const [activeEmployees, activeSites] = await Promise.all([
    prisma.employee.count({ where: { companyId, isActive: true } }),
    prisma.site.count({ where: { companyId, isActive: true } }),
  ]);

  return {
    employees: { used: activeEmployees, max: sub.plan.maxEmployees, pct: Math.round((activeEmployees / sub.plan.maxEmployees) * 100) },
    sites: { used: activeSites, max: sub.plan.maxSites, pct: Math.round((activeSites / sub.plan.maxSites) * 100) },
  };
}

export async function getBillingHistory(companyId: string) {
  return prisma.invoice.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getBillingEvents(companyId: string) {
  return prisma.billingEvent.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getPendingCheckout(companyId: string): Promise<{
  saleId: string;
  createdAt: Date;
  planName?: string;
  billingCycle?: BillingCycle;
} | null> {
  const now = Date.now();
  const initiatedEvents = await prisma.billingEvent.findMany({
    where: { companyId, type: "payment_initiated", chariowSaleId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  for (const event of initiatedEvents) {
    if (!event.chariowSaleId) continue;

    const resolved = await prisma.billingEvent.findFirst({
      where: {
        companyId,
        chariowSaleId: event.chariowSaleId,
        type: { in: ["payment_success", "payment_failed"] },
      },
      select: { id: true },
    });

    if (resolved) continue;

    // Évite d'afficher un "paiement en attente" indéfiniment.
    if (now - event.createdAt.getTime() > 30 * 60 * 1000) {
      continue;
    }

    const metadata = (event.metadata ?? {}) as {
      planName?: string;
      billingCycle?: BillingCycle;
    };

    return {
      saleId: event.chariowSaleId,
      createdAt: event.createdAt,
      planName: metadata.planName,
      billingCycle: metadata.billingCycle,
    };
  }

  return null;
}
