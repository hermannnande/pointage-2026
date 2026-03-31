"use server";

import { PERMISSIONS } from "@/config/permissions";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function getSubscriptionAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.BILLING_VIEW);
  return billingService.getSubscription(ctx.companyId);
}

export async function getPlansAction() {
  return billingService.getPlans();
}

export async function getSubscriptionStatusAction() {
  const ctx = await getContext();
  return billingService.checkSubscriptionStatus(ctx.companyId);
}

export async function getQuotaStatusAction() {
  const ctx = await getContext();
  return billingService.getQuotaStatus(ctx.companyId);
}

export async function getBillingHistoryAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.BILLING_VIEW);
  return billingService.getBillingHistory(ctx.companyId);
}

export async function createCheckoutAction(
  planId: string,
  billingCycle: "MONTHLY" | "YEARLY",
): Promise<ActionResult<{ checkoutUrl: string }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.BILLING_MANAGE);

    await billingService.changePlan(ctx.companyId, planId, billingCycle);

    const sub = await billingService.getSubscription(ctx.companyId);
    if (!sub) return { success: false, error: "Abonnement introuvable" };

    const amount = billingCycle === "YEARLY" ? sub.plan.priceYearly : sub.plan.priceMonthly;

    const { checkoutUrl } = await chariowService.createCheckoutSession({
      companyId: ctx.companyId,
      planName: sub.plan.name,
      amount,
      currency: sub.plan.currency,
      billingCycle,
      customerEmail: ctx.user.email,
      customerName: ctx.user.fullName,
    });

    return { success: true, data: { checkoutUrl } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur de paiement" };
  }
}

export async function cancelSubscriptionAction(): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.BILLING_MANAGE);
    await billingService.cancelSubscription(ctx.companyId);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}
