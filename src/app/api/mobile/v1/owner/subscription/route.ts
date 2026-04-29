/**
 * GET /api/mobile/v1/owner/subscription
 *
 * Vérifie l'état de l'abonnement de l'entreprise du propriétaire / admin.
 * Permet à l'app mobile owner d'afficher un banner d'avertissement et
 * d'orienter vers le renouvellement.
 *
 * Réponse 200 :
 *   {
 *     isAccessible: boolean,
 *     status: SubStatus,           // TRIALING | ACTIVE | GRACE_PERIOD | PAST_DUE | EXPIRED | CANCELLED
 *     remainingDays: number,
 *     message: string,
 *     plan?: { slug, name, priceMonthly, priceYearly, currency, maxEmployees, maxSites },
 *     billingCycle?: BillingCycle,
 *     trialEndsAt?: string | null,
 *     currentPeriodEnd?: string | null,
 *     gracePeriodEndsAt?: string | null,
 *   }
 *
 * NB : `checkSubscriptionStatus` a un effet de bord côté serveur — il
 * passe automatiquement la souscription en EXPIRED / GRACE_PERIOD si la
 * date est dépassée, exactement comme le fait le layout dashboard web.
 * Le mobile profite donc gratuitement du même mécanisme de bascule.
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

  // On lit la souscription après checkSubscriptionStatus pour récupérer
  // le plan et les dates utiles à l'UI mobile (banner, écran billing).
  const sub = await prisma.subscription.findUnique({
    where: { companyId },
    include: { plan: true },
  });

  return ok({
    isAccessible: status.isAccessible,
    status: status.status,
    remainingDays: status.daysRemaining,
    message: status.message,
    plan: sub?.plan
      ? {
          slug: sub.plan.slug,
          name: sub.plan.name,
          priceMonthly: sub.plan.priceMonthly,
          priceYearly: sub.plan.priceYearly,
          currency: sub.plan.currency,
          maxEmployees: sub.plan.maxEmployees,
          maxSites: sub.plan.maxSites,
        }
      : undefined,
    billingCycle: sub?.billingCycle,
    trialEndsAt: sub?.trialEndsAt?.toISOString() ?? null,
    currentPeriodEnd: sub?.currentPeriodEnd?.toISOString() ?? null,
    gracePeriodEndsAt: sub?.gracePeriodEndsAt?.toISOString() ?? null,
  });
}

export const OPTIONS = preflight;
