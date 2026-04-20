/**
 * GET /api/mobile/v1/employee/subscription
 *
 * Vérifie l'état de l'abonnement de l'entreprise de l'employé.
 * Permet à l'app de bloquer/débloquer le pointage selon le statut.
 */

import { prisma } from "@/lib/prisma/client";

import { ok } from "../../_lib/api-response";
import { requireEmployeeAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const sub = await prisma.subscription.findUnique({
    where: { companyId: auth.session.companyId },
  });

  if (!sub) {
    return ok({
      isAccessible: false,
      status: "EXPIRED",
      message:
        "L'abonnement de votre entreprise a expiré. Contactez votre administrateur.",
      remainingDays: 0,
    });
  }

  const now = new Date();

  if (sub.status === "TRIALING") {
    const trialEnd = sub.trialEndsAt ?? sub.currentPeriodEnd;
    const remaining = Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000);
    if (remaining <= 0) {
      return ok({
        isAccessible: false,
        status: "EXPIRED",
        message:
          "La période d'essai de votre entreprise a expiré. Contactez votre administrateur.",
        remainingDays: 0,
      });
    }
    return ok({
      isAccessible: true,
      status: "TRIALING",
      message: "",
      remainingDays: remaining,
    });
  }

  if (sub.status === "ACTIVE") {
    return ok({
      isAccessible: true,
      status: "ACTIVE",
      message: "",
      remainingDays: null,
    });
  }

  if (sub.status === "GRACE_PERIOD" || sub.status === "PAST_DUE") {
    const graceEnd = sub.gracePeriodEndsAt ?? sub.currentPeriodEnd;
    const remaining = Math.ceil((graceEnd.getTime() - now.getTime()) / 86_400_000);
    if (remaining <= 0) {
      return ok({
        isAccessible: false,
        status: "EXPIRED",
        message:
          "L'abonnement de votre entreprise a expiré. Contactez votre administrateur.",
        remainingDays: 0,
      });
    }
    return ok({
      isAccessible: true,
      status: sub.status,
      message: "",
      remainingDays: remaining,
    });
  }

  return ok({
    isAccessible: false,
    status: sub.status,
    message:
      "L'abonnement de votre entreprise est inactif. Contactez votre administrateur.",
    remainingDays: 0,
  });
}

export const OPTIONS = preflight;
