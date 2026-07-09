import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { GRACE_PERIOD_DAYS } from "@/lib/constants";
import { sendBillingMilestone } from "@/services/billing-notifications.service";
import {
  sendTrialReminderWhatsApp,
  sendTrialEndedWhatsApp,
} from "@/services/whatsapp.service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * CRON quotidien — transitions de statut et notifications de renouvellement.
 *
 * Configuration Vercel : voir `vercel.json` (schedule: "0 8 * * *" → 8h UTC).
 *
 * Sécurité : protégé par `Authorization: Bearer ${CRON_SECRET}`.
 * Vercel injecte automatiquement ce header sur les CRON natifs.
 */
export async function GET(req: NextRequest) {
  // 1) Auth — Vercel CRON ou appel manuel avec le secret
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET non configuré côté serveur" },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const summary = {
    scanned: 0,
    transitionedToGrace: 0,
    transitionedToExpired: 0,
    notificationsCreated: 0,
    notificationsSkipped: 0,
    errors: [] as { companyId: string; error: string }[],
  };

  // 2) Charger toutes les subscriptions actives ou en grâce ou en essai
  const subs = await prisma.subscription.findMany({
    where: {
      status: { in: ["TRIALING", "ACTIVE", "GRACE_PERIOD", "PAST_DUE"] },
    },
    include: {
      plan: { select: { name: true } },
      company: { select: { id: true, name: true } },
    },
  });

  summary.scanned = subs.length;

  for (const sub of subs) {
    try {
      const planName = sub.plan.name;
      const trackNotification = async (params: {
        milestone:
          | "renewal_j7"
          | "renewal_j3"
          | "renewal_j0"
          | "grace_start"
          | "grace_last_day"
          | "suspended"
          | "trial_j3"
          | "trial_j0";
        daysRemaining: number;
        periodKey: string;
      }) => {
        const { created, skipped } = await sendBillingMilestone({
          companyId: sub.companyId,
          subscriptionId: sub.id,
          planName,
          milestone: params.milestone,
          daysRemaining: params.daysRemaining,
          periodKey: params.periodKey,
        });
        summary.notificationsCreated += created;
        summary.notificationsSkipped += skipped;
      };

      // ── TRIALING ─────────────────────────────────────────────
      if (sub.status === "TRIALING") {
        const trialEnd = sub.trialEndsAt ?? sub.currentPeriodEnd;
        const daysLeft = Math.ceil(
          (trialEnd.getTime() - now.getTime()) / 86_400_000,
        );
        const periodKey = trialEnd.toISOString();

        if (daysLeft <= 0) {
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "EXPIRED" },
          });
          summary.transitionedToExpired++;
          await trackNotification({
            milestone: "trial_j0",
            daysRemaining: 0,
            periodKey,
          });
          // WhatsApp fin d'essai (idempotent via dedupeKey).
          await sendTrialEndedWhatsApp({
            companyId: sub.companyId,
            subscriptionId: sub.id,
            periodKey,
          });
        } else if (daysLeft <= 3) {
          await trackNotification({
            milestone: "trial_j3",
            daysRemaining: daysLeft,
            periodKey,
          });
          // WhatsApp quotidien pendant les 3 jours d'essai : rappel de fin
          // d'essai avec lien de paiement (app installée ou web). La
          // dedupeKey inclut la date du jour → 1 message max par jour.
          await sendTrialReminderWhatsApp({
            companyId: sub.companyId,
            subscriptionId: sub.id,
            daysLeft,
          });
        }
        continue;
      }

      // ── ACTIVE ───────────────────────────────────────────────
      if (sub.status === "ACTIVE") {
        const daysLeft = Math.ceil(
          (sub.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000,
        );
        const periodKey = sub.currentPeriodEnd.toISOString();

        if (daysLeft <= 0) {
          // Transition vers GRACE_PERIOD
          const graceEnd = new Date(sub.currentPeriodEnd);
          graceEnd.setDate(graceEnd.getDate() + GRACE_PERIOD_DAYS);
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "GRACE_PERIOD", gracePeriodEndsAt: graceEnd },
          });
          summary.transitionedToGrace++;
          await trackNotification({
            milestone: "grace_start",
            daysRemaining: GRACE_PERIOD_DAYS,
            periodKey,
          });
        } else if (daysLeft <= 1) {
          await trackNotification({
            milestone: "renewal_j0",
            daysRemaining: daysLeft,
            periodKey,
          });
        } else if (daysLeft <= 3) {
          await trackNotification({
            milestone: "renewal_j3",
            daysRemaining: daysLeft,
            periodKey,
          });
        } else if (daysLeft <= 7) {
          await trackNotification({
            milestone: "renewal_j7",
            daysRemaining: daysLeft,
            periodKey,
          });
        }
        continue;
      }

      // ── GRACE_PERIOD / PAST_DUE ──────────────────────────────
      if (sub.status === "GRACE_PERIOD" || sub.status === "PAST_DUE") {
        const graceEnd = sub.gracePeriodEndsAt ?? sub.currentPeriodEnd;
        const daysLeft = Math.ceil(
          (graceEnd.getTime() - now.getTime()) / 86_400_000,
        );
        const periodKey = graceEnd.toISOString();

        if (daysLeft <= 0) {
          // Transition vers EXPIRED
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "EXPIRED" },
          });
          summary.transitionedToExpired++;
          await trackNotification({
            milestone: "suspended",
            daysRemaining: 0,
            periodKey,
          });
        } else if (daysLeft <= 1) {
          await trackNotification({
            milestone: "grace_last_day",
            daysRemaining: daysLeft,
            periodKey,
          });
        }
        continue;
      }
    } catch (err) {
      summary.errors.push({
        companyId: sub.companyId,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  console.log("[CRON billing-tick]", JSON.stringify(summary));
  return NextResponse.json({ ok: true, runAt: now.toISOString(), summary });
}
