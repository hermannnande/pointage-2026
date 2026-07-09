/**
 * Affiche les derniers messages WhatsApp journalisés (statut d'envoi).
 * Usage : npx tsx scripts/check-whatsapp-log.ts
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const { prisma } = await import("@/lib/prisma/client");
  const messages = await prisma.whatsAppMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  for (const m of messages) {
    console.log(
      `${m.status === "SENT" ? "✅" : m.status === "FAILED" ? "❌" : "⏳"} ` +
        `${m.createdAt.toISOString().slice(0, 16)} | ${m.type} → ${m.phone}` +
        (m.error ? ` | ${m.error.slice(0, 100)}` : ""),
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
