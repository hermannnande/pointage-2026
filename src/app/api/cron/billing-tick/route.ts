import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma/client";
import { GRACE_PERIOD_DAYS } from "@/lib/constants";
import { sendBillingMilestone } from "@/services/billing-notifications.service";
import {
  sendTrialReminderWhatsApp,
  sendTrialEndedWhatsApp,
  getWasenderSessionStatus,
} from "@/services/whatsapp.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ─── Anti-spam WhatsApp ──────────────────────────────────────
// WasenderAPI (numéro WhatsApp classique) : un burst de dizaines de
// messages identiques = risque de bannissement du numéro. Stratégie :
//   • max 15 messages WhatsApp par exécution du cron ;
//   • cron toutes les 2 h en journée (voir vercel.json) → le backlog se
//     draine progressivement, la dedupeKey par jour évite tout doublon ;
//   • pause aléatoire 5–8 s entre deux envois (limite API + rythme humain) ;
//   • pas de message « essai terminé » pour un essai expiré depuis plus de
//     MAX_TRIAL_ENDED_AGE_DAYS jours — la transition se fait en silence.
const MAX_WHATSAPP_PER_RUN = 15;
const MAX_TRIAL_ENDED_AGE_DAYS = 5;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const humanPause = () => sleep(5000 + Math.floor(Math.random() * 3000));

/**
 * CRON — transitions de statut et notifications de renouvellement.
 *
 * Configuration Vercel : voir `vercel.json` (toutes les 2 h, 6h–20h UTC).
 * Toutes les notifications sont idempotentes (dedupeKey) → rejouable sans
 * risque de doublon.
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
    whatsappSent: 0,
    whatsappCapReached: false,
    whatsappSessionStatus: null as string | null,
    errors: [] as { companyId: string; error: string }[],
  };

  // Budget WhatsApp de cette exécution (anti-spam, voir constantes plus haut).
  // Si la session WasenderAPI n'est pas connectée, on n'envoie rien : les
  // transitions de statut se font quand même, et les rappels du jour seront
  // envoyés par un run ultérieur une fois la session reconnectée.
  let whatsappBudget = MAX_WHATSAPP_PER_RUN;
  summary.whatsappSessionStatus = await getWasenderSessionStatus();
  if (
    summary.whatsappSessionStatus !== null &&
    summary.whatsappSessionStatus !== "connected"
  ) {
    console.error(
      `[CRON billing-tick] Session WasenderAPI "${summary.whatsappSessionStatus}" — envois WhatsApp suspendus`,
    );
    whatsappBudget = 0;
  }
  const spendWhatsApp = async (send: () => Promise<{ sent: boolean }>) => {
    if (whatsappBudget <= 0) {
      summary.whatsappCapReached = true;
      return;
    }
    const { sent } = await send();
    if (sent) {
      whatsappBudget--;
      summary.whatsappSent++;
      // Rythme humain entre deux envois réels (les skips ne comptent pas).
      if (whatsappBudget > 0) await humanPause();
    }
  };

  // 2) Charger toutes les subscriptions actives ou en grâce ou en essai.
  // Tri par fin de période croissante → si le budget WhatsApp est épuisé,
  // ce sont les moins urgents qui attendent l'exécution suivante.
  const subs = await prisma.subscription.findMany({
    where: {
      status: { in: ["TRIALING", "ACTIVE", "GRACE_PERIOD", "PAST_DUE"] },
    },
    include: {
      plan: { select: { name: true } },
      company: { select: { id: true, name: true } },
    },
    orderBy: { currentPeriodEnd: "asc" },
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
          // WhatsApp fin d'essai (idempotent via dedupeKey) — uniquement si
          // l'essai vient de se terminer : un « votre essai est terminé »
          // envoyé des semaines après coup serait perçu comme du spam.
          const daysSinceEnd = -daysLeft;
          if (daysSinceEnd <= MAX_TRIAL_ENDED_AGE_DAYS) {
            await spendWhatsApp(() =>
              sendTrialEndedWhatsApp({
                companyId: sub.companyId,
                subscriptionId: sub.id,
                periodKey,
              }),
            );
          }
        } else if (daysLeft <= 3) {
          await trackNotification({
            milestone: "trial_j3",
            daysRemaining: daysLeft,
            periodKey,
          });
          // WhatsApp quotidien pendant les 3 jours d'essai : rappel de fin
          // d'essai avec lien de paiement (app installée ou web). La
          // dedupeKey inclut la date du jour → 1 message max par jour.
          await spendWhatsApp(() =>
            sendTrialReminderWhatsApp({
              companyId: sub.companyId,
              subscriptionId: sub.id,
              daysLeft,
            }),
          );
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
