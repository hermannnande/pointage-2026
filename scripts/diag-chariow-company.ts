/**
 * Diagnostic ciblé d'une entreprise : liste ses sales Chariow + état BDD.
 *
 * Usage : npx tsx scripts/diag-chariow-company.ts <companyIdOrName>
 * Ex    : npx tsx scripts/diag-chariow-company.ts "Ets Bethesda"
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const query = process.argv[2];
  if (!query) {
    console.error("Usage: npx tsx scripts/diag-chariow-company.ts <id ou nom>");
    process.exit(1);
  }

  const { prisma } = await import("@/lib/prisma/client");
  const chariow = await import("@/services/chariow.service");

  const company = await prisma.company.findFirst({
    where: {
      OR: [
        { id: query },
        { name: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      subscription: { include: { plan: true } },
      memberships: {
        include: {
          user: { select: { id: true, email: true, fullName: true, phone: true } },
        },
      },
    },
  });

  if (!company) {
    console.error(`Aucune entreprise trouvée pour "${query}"`);
    process.exit(1);
  }

  console.log("\n=== ENTREPRISE ===");
  console.log(`Nom        : ${company.name}`);
  console.log(`ID         : ${company.id}`);
  console.log(`Pays       : ${company.country ?? "—"}`);
  console.log(`Téléphone  : ${company.phone ?? "—"}`);
  console.log(`Email     : ${company.email ?? "—"}`);

  if (company.subscription) {
    const s = company.subscription;
    console.log("\n=== ABONNEMENT ===");
    console.log(`Plan          : ${s.plan.name} (${s.billingCycle})`);
    console.log(`Statut        : ${s.status}`);
    console.log(`Période       : ${s.currentPeriodStart.toISOString().slice(0, 10)} → ${s.currentPeriodEnd.toISOString().slice(0, 10)}`);
    console.log(`Grace end     : ${s.gracePeriodEndsAt?.toISOString() ?? "—"}`);
    console.log(`Dernier sale  : ${s.chariowSaleId ?? "—"}`);
  } else {
    console.log("\n❌ Aucun abonnement");
  }

  console.log("\n=== USERS ===");
  const users = company.memberships.map((m) => m.user);
  for (const u of users) {
    console.log(`  • ${u.fullName} <${u.email}> tel=${u.phone ?? "—"}`);
  }

  // Billing events locaux
  const events = await prisma.billingEvent.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
  console.log(`\n=== ${events.length} BILLING EVENTS LOCAUX (15 derniers) ===`);
  for (const e of events) {
    console.log(
      `  ${e.createdAt.toISOString().slice(0, 16)} | ${e.type.padEnd(20)} | sale=${e.chariowSaleId ?? "—"} | ${e.amount ? `${e.amount} ${e.currency}` : ""}`,
    );
  }

  // Sales Chariow
  console.log("\n=== SALES CHARIOW (100 dernières — filtrées) ===");
  const sales = await chariow.listSales(100).catch((err) => {
    console.error("  ❌ Erreur listSales:", err.message);
    return [];
  });

  const userEmails = users.map((u) => u.email.toLowerCase());
  const relevant = sales.filter((s) => {
    if (s.custom_metadata?.company_id === company.id) return true;
    const email = s.customer?.email?.toLowerCase();
    if (email && userEmails.includes(email)) return true;
    const rawPhone = s.customer?.phone;
    const phoneStr =
      typeof rawPhone === "string"
        ? rawPhone
        : typeof rawPhone === "object" && rawPhone !== null
          ? `${(rawPhone as { country_code?: string }).country_code ?? ""}${(rawPhone as { number?: string }).number ?? ""}`
          : "";
    const phone = phoneStr.replace(/\D/g, "");
    const companyPhone = (company.phone ?? "").replace(/\D/g, "");
    if (phone && companyPhone && phone.endsWith(companyPhone.slice(-8))) return true;
    return false;
  });

  if (relevant.length === 0) {
    console.log(`  Aucune sale Chariow trouvée pour cette entreprise (sur ${sales.length} sales scannées)`);
  }

  for (const s of relevant) {
    console.log(`\n  ── Sale ${s.id} ──`);
    console.log(`     Status         : ${s.status} (payment=${s.payment?.status ?? "—"})`);
    console.log(`     Montant        : ${s.amount?.value} ${s.amount?.currency}`);
    console.log(`     Produit        : ${s.product?.name}`);
    console.log(`     Plan/Cycle     : ${s.custom_metadata?.plan_slug} / ${s.custom_metadata?.billing_cycle}`);
    console.log(`     Client         : ${s.customer?.first_name} ${s.customer?.last_name} <${s.customer?.email}>`);
    console.log(`     Téléphone      : ${s.customer?.phone} (${s.customer?.country})`);
    console.log(`     company_id meta: ${s.custom_metadata?.company_id ?? "(absent)"}`);
    console.log(`     ${s.custom_metadata?.company_id === company.id ? "✅ Match company_id" : "⚠️ Pas de match company_id"}`);
    console.log(`     Créée le       : ${s.created_at}`);
    console.log(`     Complétée le   : ${s.completed_at ?? "—"}`);
    console.log(`     Abandonnée le  : ${s.abandoned_at ?? "—"}`);
    console.log(`     Échouée le     : ${s.failed_at ?? "—"}`);
    console.log(`     Checkout URL   : ${s.checkout?.url ?? s.payment?.checkout_url ?? "—"}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
