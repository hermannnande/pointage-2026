/**
 * Force l'activation d'un abonnement à partir d'un saleId Chariow,
 * même si custom_metadata.company_id manque dans le retour API.
 *
 * Usage : npx tsx scripts/fix-sale.ts <saleId> <companyId> [planSlug] [cycle]
 * Ex    : npx tsx scripts/fix-sale.ts SALEWQ8MA0QC3U09XT5 cmo3ytg6b002v04jlncwh5dgq business MONTHLY
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const [saleId, companyId, planSlug, cycleArg] = process.argv.slice(2);
  if (!saleId || !companyId) {
    console.error("Usage: npx tsx scripts/fix-sale.ts <saleId> <companyId> [planSlug] [cycle]");
    process.exit(1);
  }
  const billingCycle = (cycleArg ?? "MONTHLY") as "MONTHLY" | "YEARLY";

  const billing = await import("@/services/billing.service");
  const chariow = await import("@/services/chariow.service");

  console.log(`\n→ Récupération de la sale ${saleId} chez Chariow…`);
  const sale = await chariow.getSale(saleId);
  console.log(`  Status        : ${sale.status}`);
  console.log(`  Payment status: ${sale.payment?.status ?? "—"}`);
  console.log(`  Montant       : ${sale.amount?.value} ${sale.amount?.currency}`);
  console.log(`  Produit       : ${sale.product?.name} (id=${sale.product?.id ?? "—"})`);
  console.log(`  Client        : ${sale.customer?.email}`);

  const ok = sale.status === "completed" || sale.status === "settled" || sale.payment?.status === "success";
  if (!ok) {
    console.error(`\n❌ Cette sale n'est PAS payée (status=${sale.status}, payment=${sale.payment?.status}). Annulation.`);
    process.exit(1);
  }

  let effectivePlanSlug = planSlug;
  if (!effectivePlanSlug && sale.product?.id) {
    const inferred = chariow.getPlanFromProductId(sale.product.id);
    if (inferred) effectivePlanSlug = inferred.planSlug;
  }

  console.log(`\n→ Activation de l'abonnement pour company=${companyId}`);
  console.log(`  Plan slug  : ${effectivePlanSlug ?? "(conservé)"}`);
  console.log(`  Cycle      : ${billingCycle}`);

  const sub = await billing.handlePaymentSuccess(
    companyId,
    sale.amount?.value ?? 0,
    sale.id,
    {
      planSlug: effectivePlanSlug,
      billingCycle,
    },
  );

  console.log(`\n✅ Abonnement activé !`);
  console.log(`  Status        : ${sub?.status}`);
  console.log(`  Période       : ${sub?.currentPeriodStart.toISOString()} → ${sub?.currentPeriodEnd.toISOString()}`);

  const { prisma } = await import("@/lib/prisma/client");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
