/**
 * Test manuel de la fonction activateSubscriptionManually.
 *
 * Usage : npx tsx scripts/test-activate-subscription.ts
 *
 * Active l'abonnement de "bureau bingerville garrage orange" (LILE TOURE)
 * qui est en EXPIRED, pour vérifier que tout le flow marche.
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { prisma } = await import("@/lib/prisma/client");
  const { activateSubscriptionManually } = await import(
    "@/services/super-admin.service"
  );

  // Trouve un super-admin pour tester
  const admin = await prisma.user.findFirst({
    where: { isSuperAdmin: true },
    select: { id: true, email: true },
  });
  if (!admin) {
    console.error("Pas de super-admin trouvé");
    process.exit(1);
  }
  console.log(`Acteur : ${admin.email}\n`);

  const company = await prisma.company.findFirst({
    where: { name: { contains: "bingerville" } },
    include: { subscription: { include: { plan: true } } },
  });
  if (!company) {
    console.error("Entreprise 'bingerville' introuvable");
    process.exit(1);
  }

  console.log(`État AVANT activation :`);
  console.log(`  Company    : ${company.name}`);
  console.log(`  Status     : ${company.subscription?.status ?? "NO_SUB"}`);
  console.log(`  Plan       : ${company.subscription?.plan?.name ?? "—"}`);
  console.log(
    `  Period end : ${company.subscription?.currentPeriodEnd?.toISOString().slice(0, 10) ?? "—"}`,
  );

  const result = await activateSubscriptionManually({
    companyId: company.id,
    planSlug: "starter",
    billingCycle: "MONTHLY",
    durationMonths: 1,
    amount: 4500,
    currency: "XOF",
    paymentRef: "TEST-ACTIVATION-001",
    note: "Test du nouveau systeme d'activation manuelle",
    actorId: admin.id,
  });

  console.log(`\n✅ Activation reussie :`);
  console.log(`  Plan applique : ${result.plan.name}`);
  console.log(`  Duree         : ${result.months} mois`);
  console.log(
    `  Periode end   : ${result.periodEnd.toISOString().slice(0, 10)}`,
  );

  const after = await prisma.subscription.findUnique({
    where: { companyId: company.id },
    include: { plan: true },
  });
  console.log(`\nÉtat APRÈS activation :`);
  console.log(`  Status     : ${after?.status}`);
  console.log(`  Plan       : ${after?.plan?.name}`);
  console.log(`  Period     : ${after?.currentPeriodStart.toISOString().slice(0, 10)} → ${after?.currentPeriodEnd.toISOString().slice(0, 10)}`);
  console.log(`  Trial end  : ${after?.trialEndsAt?.toISOString() ?? "null ✓"}`);
  console.log(`  Grace end  : ${after?.gracePeriodEndsAt?.toISOString() ?? "null ✓"}`);

  // Vérifie le billing event créé
  const event = await prisma.billingEvent.findFirst({
    where: { companyId: company.id, type: "manual_activation" },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\nBillingEvent cree :`);
  console.log(`  Type      : ${event?.type}`);
  console.log(`  Amount    : ${event?.amount} ${event?.currency}`);
  console.log(`  Metadata  : ${JSON.stringify(event?.metadata)}`);

  // Vérifie l'invoice
  const invoice = await prisma.invoice.findFirst({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\nInvoice creee :`);
  console.log(`  Number    : ${invoice?.number}`);
  console.log(`  Amount    : ${invoice?.amount} ${invoice?.currency}`);
  console.log(`  Status    : ${invoice?.status}`);

  // Vérifie le log
  const log = await prisma.superAdminLog.findFirst({
    where: { action: "ACTIVATE_SUBSCRIPTION", targetId: company.id },
    orderBy: { createdAt: "desc" },
  });
  console.log(`\nSuperAdminLog cree :`);
  console.log(`  Action  : ${log?.action}`);
  console.log(`  Comment : ${log?.comment}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
