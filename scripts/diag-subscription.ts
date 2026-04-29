/**
 * Inspecte l'etat des abonnements de toutes les entreprises.
 *
 * Usage : npx tsx scripts/diag-subscription.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { prisma } = await import("@/lib/prisma/client");
  const { checkSubscriptionStatus } = await import("@/services/billing.service");

  const companies = await prisma.company.findMany({
    select: {
      id: true,
      name: true,
      isActive: true,
      trialEndsAt: true,
      subscription: {
        select: {
          status: true,
          billingCycle: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
          trialEndsAt: true,
          gracePeriodEndsAt: true,
          plan: { select: { name: true, slug: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  console.log(`\n=== ${companies.length} ENTREPRISE(S) ===\n`);

  for (const c of companies) {
    console.log(`[${c.name}] (id=${c.id})`);
    console.log(`  isActive : ${c.isActive}`);
    if (!c.subscription) {
      console.log(`  ❌ Aucune subscription`);
    } else {
      const s = c.subscription;
      console.log(
        `  Plan      : ${s.plan?.name ?? '?'} (${s.plan?.slug ?? '?'})`,
      );
      console.log(`  Status    : ${s.status} | cycle ${s.billingCycle}`);
      console.log(`  Trial end : ${s.trialEndsAt?.toISOString() ?? '-'}`);
      console.log(`  Period    : ${s.currentPeriodStart.toISOString().slice(0, 10)} → ${s.currentPeriodEnd.toISOString().slice(0, 10)}`);
      console.log(`  Grace end : ${s.gracePeriodEndsAt?.toISOString() ?? '-'}`);

      const status = await checkSubscriptionStatus(c.id);
      console.log(
        `  CHECK     : isAccessible=${status.isAccessible} status=${status.status} daysRemaining=${status.daysRemaining}`,
      );
      console.log(`  Message   : "${status.message}"`);
    }
    console.log();
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
