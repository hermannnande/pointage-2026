import { prisma } from "@/lib/prisma/client";

type Milestone =
  | "renewal_j7"
  | "renewal_j3"
  | "renewal_j0"
  | "grace_start"
  | "grace_last_day"
  | "suspended"
  | "trial_j3"
  | "trial_j0";

interface MilestoneContent {
  title: string;
  message: (planName: string, daysRemaining: number) => string;
  type: string;
}

const CONTENT: Record<Milestone, MilestoneContent> = {
  renewal_j7: {
    title: "Renouvellement dans 7 jours",
    type: "billing_renewal_reminder",
    message: (plan) =>
      `Votre abonnement ${plan} arrive à échéance dans 7 jours. Pensez à le renouveler depuis la page Facturation.`,
  },
  renewal_j3: {
    title: "Renouvellement dans 3 jours",
    type: "billing_renewal_reminder",
    message: (plan) =>
      `Votre abonnement ${plan} arrive à échéance dans 3 jours. Renouvelez-le pour éviter toute interruption.`,
  },
  renewal_j0: {
    title: "Abonnement à renouveler aujourd'hui",
    type: "billing_renewal_due",
    message: (plan) =>
      `Votre abonnement ${plan} arrive à échéance aujourd'hui. Renouvelez-le dès maintenant pour conserver l'accès.`,
  },
  grace_start: {
    title: "Paiement requis",
    type: "billing_grace_started",
    message: (plan, days) =>
      `Votre abonnement ${plan} est expiré. Vous avez ${days} jour(s) pour le renouveler avant suspension.`,
  },
  grace_last_day: {
    title: "Dernier jour avant suspension",
    type: "billing_grace_last_day",
    message: (plan) =>
      `Dernier jour avant la suspension de votre abonnement ${plan}. Renouvelez immédiatement pour éviter l'interruption.`,
  },
  suspended: {
    title: "Abonnement suspendu",
    type: "billing_suspended",
    message: (plan) =>
      `Votre abonnement ${plan} est suspendu. Renouvelez-le depuis la page Facturation pour réactiver l'accès.`,
  },
  trial_j3: {
    title: "Essai gratuit : 3 jours restants",
    type: "billing_trial_reminder",
    message: () =>
      `Votre essai gratuit se termine dans 3 jours. Choisissez un plan pour continuer à utiliser OControle.`,
  },
  trial_j0: {
    title: "Essai gratuit terminé aujourd'hui",
    type: "billing_trial_ending",
    message: () =>
      `Votre essai gratuit se termine aujourd'hui. Choisissez un plan pour conserver l'accès.`,
  },
};

/**
 * Envoie une notification "milestone billing" aux owners/admins d'une company.
 *
 * Idempotent : la clé d'unicité est (userId, milestone, periodKey), où
 * periodKey est l'ISO date de la fin de période actuelle. Cela permet de :
 *   - ne pas spammer le même utilisateur deux fois pour la même échéance
 *   - autoriser de re-notifier après un renouvellement (nouvelle periodKey)
 */
export async function sendBillingMilestone(params: {
  companyId: string;
  subscriptionId: string;
  milestone: Milestone;
  planName: string;
  daysRemaining: number;
  /** ISO date de fin de la période concernée (currentPeriodEnd ou trialEndsAt) */
  periodKey: string;
}): Promise<{ created: number; skipped: number }> {
  const { companyId, subscriptionId, milestone, planName, daysRemaining, periodKey } = params;
  const content = CONTENT[milestone];

  const owners = await prisma.membership.findMany({
    where: {
      companyId,
      isActive: true,
      OR: [{ isOwner: true }, { role: { slug: { in: ["admin", "owner"] } } }],
    },
    select: { userId: true },
  });

  if (owners.length === 0) return { created: 0, skipped: 0 };

  let created = 0;
  let skipped = 0;

  for (const m of owners) {
    const already = await prisma.notification.findFirst({
      where: {
        userId: m.userId,
        type: content.type,
        AND: [
          { data: { path: ["milestone"], equals: milestone } },
          { data: { path: ["period_key"], equals: periodKey } },
        ],
      },
      select: { id: true },
    });

    if (already) {
      skipped++;
      continue;
    }

    await prisma.notification.create({
      data: {
        userId: m.userId,
        companyId,
        type: content.type,
        title: content.title,
        message: content.message(planName, daysRemaining),
        data: {
          subscription_id: subscriptionId,
          milestone,
          period_key: periodKey,
          days_remaining: daysRemaining,
          plan_name: planName,
        },
      },
    });
    created++;
  }

  return { created, skipped };
}
