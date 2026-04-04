"use server";

import { PERMISSIONS } from "@/config/permissions";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const ctx = await getTenantContext(user.id);
  return ctx ?? null;
}

export interface BillingPageData {
  subscription: {
    planId: string;
    planName: string;
    planSlug: string;
    planCurrency: string;
    billingCycle: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
  } | null;
  subscriptionStatus: {
    isAccessible: boolean;
    status: string;
    daysRemaining: number;
    message: string;
  } | null;
  quota: {
    employees: { used: number; max: number; pct: number };
    sites: { used: number; max: number; pct: number };
  } | null;
  plans: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    priceMonthly: number;
    priceYearly: number;
    currency: string;
    maxEmployees: number;
    maxSites: number;
    isPopular: boolean;
    features: { name: string; included: boolean }[];
  }[];
  invoices: {
    id: string;
    number: string;
    amount: number;
    currency: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    paidAt: string | null;
    createdAt: string;
  }[];
  pendingCheckout: {
    saleId: string;
    createdAt: string;
    planName?: string;
    billingCycle?: "MONTHLY" | "YEARLY";
  } | null;
}

async function syncCompletedSalesForCompany(companyId: string, userEmail: string) {
  const sales = await chariowService.listSales(100).catch(() => []);

  for (const sale of sales) {
    const paymentOk =
      sale.status === "completed" || sale.payment?.status === "success";
    if (!paymentOk) continue;

    const meta = sale.custom_metadata ?? {};
    const saleCompanyId = meta.company_id;
    const productId = sale.product?.id;
    const customerEmail = sale.customer?.email;

    const belongsToCompany =
      saleCompanyId === companyId ||
      (!saleCompanyId &&
        !!productId &&
        !!customerEmail &&
        customerEmail.toLowerCase() === userEmail.toLowerCase() &&
        !!chariowService.getPlanFromProductId(productId));

    if (!belongsToCompany) continue;

    let planId = meta.plan_id;
    let planSlug = meta.plan_slug;
    let billingCycle = meta.billing_cycle as "MONTHLY" | "YEARLY" | undefined;

    if ((!planSlug || !billingCycle) && productId) {
      const inferred = chariowService.getPlanFromProductId(productId);
      if (inferred) {
        planSlug = planSlug ?? inferred.planSlug;
        billingCycle = billingCycle ?? inferred.billingCycle;
      }
    }

    if (!planId && planSlug) {
      const plan = await billingService.getPlanBySlug(planSlug).catch(() => null);
      planId = plan?.id;
    }

    await billingService.handlePaymentSuccess(
      companyId,
      sale.amount?.value ?? 0,
      sale.id,
      {
        planId,
        planSlug,
        billingCycle,
      },
    );
  }
}

export async function getBillingPageData(): Promise<BillingPageData> {
  const ctx = await getContext();
  if (!ctx) {
    return {
      subscription: null,
      subscriptionStatus: null,
      quota: null,
      plans: [],
      invoices: [],
      pendingCheckout: null,
    };
  }

  await syncCompletedSalesForCompany(ctx.companyId, ctx.user.email).catch(
    () => undefined,
  );

  const [sub, status, quota, plans, invoices, pendingCheckout] = await Promise.all([
    billingService.getSubscription(ctx.companyId).catch(() => null),
    billingService.checkSubscriptionStatus(ctx.companyId).catch(() => null),
    billingService.getQuotaStatus(ctx.companyId).catch(() => null),
    billingService.getPlans().catch(() => []),
    billingService.getBillingHistory(ctx.companyId).catch(() => []),
    billingService.getPendingCheckout(ctx.companyId).catch(() => null),
  ]);

  return {
    subscription: sub
      ? {
          planId: sub.planId,
          planName: sub.plan.name,
          planSlug: sub.plan.slug,
          planCurrency: sub.plan.currency,
          billingCycle: sub.billingCycle,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart.toISOString(),
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        }
      : null,
    subscriptionStatus: status,
    quota,
    plans: plans.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description,
      priceMonthly: p.priceMonthly,
      priceYearly: p.priceYearly,
      currency: p.currency,
      maxEmployees: p.maxEmployees,
      maxSites: p.maxSites,
      isPopular: p.isPopular,
      features: Array.isArray(p.features)
        ? (p.features as { name: string; included: boolean }[])
        : [],
    })),
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
    pendingCheckout: pendingCheckout
      ? {
          saleId: pendingCheckout.saleId,
          createdAt: pendingCheckout.createdAt.toISOString(),
          planName: pendingCheckout.planName,
          billingCycle: pendingCheckout.billingCycle,
        }
      : null,
  };
}

export async function createCheckoutAction(
  planId: string,
  billingCycle: "MONTHLY" | "YEARLY",
): Promise<ActionResult<{ checkoutUrl: string }>> {
  try {
    const ctx = await getContext();
    if (!ctx) return { success: false, error: "Non authentifié" };
    requirePermission(ctx, PERMISSIONS.BILLING_MANAGE);

    const plan = await billingService.validatePlanChange(ctx.companyId, planId);

    const { saleId, checkoutUrl } = await chariowService.createCheckoutSession({
      companyId: ctx.companyId,
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      billingCycle,
      customerEmail: ctx.user.email,
      customerName: ctx.user.fullName,
      customerPhone: ctx.user.phone ?? undefined,
    });

    await billingService.recordPaymentInitiated({
      companyId: ctx.companyId,
      chariowSaleId: saleId,
      planId: plan.id,
      planName: plan.name,
      planSlug: plan.slug,
      billingCycle,
    });

    return { success: true, data: { checkoutUrl } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur de paiement",
    };
  }
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    if (!ctx) return { success: false, error: "Non authentifié" };
    requirePermission(ctx, PERMISSIONS.BILLING_MANAGE);
    await billingService.cancelSubscription(ctx.companyId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function confirmSaleFromReturnAction(
  saleId: string,
): Promise<
  ActionResult<{
    paymentStatus: "success" | "pending" | "failed";
    planName?: string;
  }>
> {
  try {
    const ctx = await getContext();
    if (!ctx) return { success: false, error: "Non authentifié" };
    requirePermission(ctx, PERMISSIONS.BILLING_VIEW);

    const sale = await chariowService.getSale(saleId);
    const meta = sale.custom_metadata ?? {};

    if (meta.company_id && meta.company_id !== ctx.companyId) {
      return { success: false, error: "Cette vente ne correspond pas à votre entreprise." };
    }

    const paymentOk =
      sale.status === "completed" || sale.payment?.status === "success";

    if (paymentOk) {
      await billingService.handlePaymentSuccess(
        ctx.companyId,
        sale.amount?.value ?? 0,
        sale.id,
        {
          planId: meta.plan_id,
          planSlug: meta.plan_slug,
          billingCycle:
            meta.billing_cycle === "YEARLY" || meta.billing_cycle === "MONTHLY"
              ? meta.billing_cycle
              : undefined,
        },
      );

      return {
        success: true,
        data: {
          paymentStatus: "success",
          planName: meta.plan_slug,
        },
      };
    }

    if (sale.status === "failed" || sale.payment?.status === "failed") {
      await billingService.handlePaymentFailed(ctx.companyId, sale.id);
      return { success: true, data: { paymentStatus: "failed" } };
    }

    return { success: true, data: { paymentStatus: "pending" } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Impossible de confirmer le paiement",
    };
  }
}
