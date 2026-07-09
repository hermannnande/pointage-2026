/**
 * Envoie un message WhatsApp aux clients ayant eu un problème de paiement
 * récent : échec opérateur (payment_failed) ou checkout démarré mais jamais
 * complété (payment_initiated sans success/failed).
 *
 * - 1 message maximum par entreprise (l'échec prime sur l'abandon)
 * - Les entreprises ayant réussi un paiement sur la période sont exclues
 * - Idempotent : la dedupeKey (par vente Chariow) empêche tout doublon,
 *   y compris avec les messages déjà envoyés par le webhook
 *
 * Usage :
 *   npx tsx scripts/send-whatsapp-payment-issues.ts --dry-run   (aperçu)
 *   npx tsx scripts/send-whatsapp-payment-issues.ts             (envoi réel)
 *   npx tsx scripts/send-whatsapp-payment-issues.ts --days 7    (fenêtre 7j)
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

const DRY_RUN = process.argv.includes("--dry-run");
const daysArg = process.argv.indexOf("--days");
const DAYS = daysArg > -1 ? Number(process.argv[daysArg + 1]) || 3 : 3;

async function main() {
  const { prisma } = await import("@/lib/prisma/client");
  const { sendPaymentFailedWhatsApp, sendCheckoutAbandonedWhatsApp } = await import(
    "@/services/whatsapp.service"
  );

  const since = new Date();
  since.setDate(since.getDate() - DAYS);
  const oneHourAgo = new Date(Date.now() - 3_600_000);

  const events = await prisma.billingEvent.findMany({
    where: {
      createdAt: { gte: since },
      type: { in: ["payment_initiated", "payment_failed", "payment_success", "manual_activation"] },
    },
    include: { company: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  const settledSaleIds = new Set(
    events
      .filter((e) => e.type !== "payment_initiated" && e.chariowSaleId)
      .map((e) => e.chariowSaleId as string),
  );
  const successCompanies = new Set(
    events
      .filter((e) => e.type === "payment_success" || e.type === "manual_activation")
      .map((e) => e.company.id),
  );

  const failed = events.filter((e) => e.type === "payment_failed");
  const abandoned = events.filter(
    (e) =>
      e.type === "payment_initiated" &&
      e.createdAt < oneHourAgo &&
      (!e.chariowSaleId || !settledSaleIds.has(e.chariowSaleId)),
  );

  // 1 message max par entreprise — l'échec opérateur prime sur l'abandon.
  type Pick = { kind: "failed" | "abandoned"; event: (typeof events)[number] };
  const perCompany = new Map<string, Pick>();
  for (const e of failed) {
    if (successCompanies.has(e.company.id)) continue;
    if (!perCompany.has(e.company.id)) perCompany.set(e.company.id, { kind: "failed", event: e });
  }
  for (const e of abandoned) {
    if (successCompanies.has(e.company.id)) continue;
    if (!perCompany.has(e.company.id)) perCompany.set(e.company.id, { kind: "abandoned", event: e });
  }

  console.log(
    `Fenêtre: ${DAYS} jour(s) | ${failed.length} échec(s), ${abandoned.length} abandon(s) ` +
      `| ${successCompanies.size} entreprise(s) ayant payé (exclues) ` +
      `→ ${perCompany.size} entreprise(s) à contacter${DRY_RUN ? " [DRY-RUN]" : ""}`,
  );

  const startedAt = new Date();

  for (const [companyId, pick] of perCompany) {
    const e = pick.event;
    console.log(
      `- [${pick.kind === "failed" ? "ÉCHEC" : "ABANDON"}] ${e.company.name}` +
        ` | vente=${e.chariowSaleId ?? "n/a"} | ${e.createdAt.toISOString().slice(0, 16)}`,
    );
    if (DRY_RUN) continue;

    if (pick.kind === "failed") {
      await sendPaymentFailedWhatsApp({ companyId, saleId: e.chariowSaleId ?? undefined });
    } else {
      await sendCheckoutAbandonedWhatsApp({ companyId, saleId: e.chariowSaleId ?? undefined });
    }
    // Protection de compte WasenderAPI : 1 message max toutes les 5 s.
    await new Promise((r) => setTimeout(r, 6000));
  }

  if (!DRY_RUN) {
    const sent = await prisma.whatsAppMessage.findMany({
      where: { createdAt: { gte: startedAt } },
      orderBy: { createdAt: "asc" },
    });
    console.log(`\nRésultat (${sent.length} tentative(s) d'envoi) :`);
    for (const m of sent) {
      console.log(
        `  ${m.status === "SENT" ? "✅" : "❌"} ${m.type} → ${m.phone}` +
          (m.error ? ` | erreur: ${m.error.slice(0, 120)}` : ""),
      );
    }
    const skipped = perCompany.size - sent.length;
    if (skipped > 0) {
      console.log(
        `  ⏭️  ${skipped} entreprise(s) sans envoi : déjà contactée(s) (dédup) ou sans numéro de téléphone.`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
