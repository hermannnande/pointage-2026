/**
 * Diagnostic d'un login employé qui échoue.
 *
 * Usage : npx tsx scripts/diag-employee-login.ts <phone> <password>
 *   ex : npx tsx scripts/diag-employee-login.ts +225745345063 1234
 *
 * Reproduit *exactement* la logique de /api/mobile/v1/auth/employee/login.
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), override: true });

async function main() {
  const phone = process.argv[2];
  const password = process.argv[3];

  if (!phone || !password) {
    console.error("Usage : npx tsx scripts/diag-employee-login.ts <phone> <password>");
    process.exit(1);
  }

  const { prisma } = await import("@/lib/prisma/client");
  const { verifyPassword } = await import("@/lib/employee-auth");
  const { generatePhoneVariants } = await import("@/lib/phone-variants");

  console.log("\n=== DIAGNOSTIC LOGIN EMPLOYÉ ===\n");
  console.log("Phone reçu :", JSON.stringify(phone));
  console.log("Password reçu :", JSON.stringify(password), `(${password.length} caractères)`);

  const variants = generatePhoneVariants(phone);
  console.log("\nVariants générés (logique actuelle) :", variants);

  const allMatches = await prisma.employee.findMany({
    where: { phone: { in: variants } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      isActive: true,
      passwordHash: true,
      siteId: true,
      site: { select: { name: true } },
      company: { select: { id: true, name: true } },
    },
  });

  console.log(`\nEmployés trouvés via variants : ${allMatches.length}`);
  for (const e of allMatches) {
    console.log("  -", {
      id: e.id,
      nom: `${e.firstName} ${e.lastName}`,
      phoneEnBDD: e.phone,
      isActive: e.isActive,
      hasPasswordHash: !!e.passwordHash,
      siteId: e.siteId,
      siteName: e.site?.name ?? null,
      company: e.company.name,
    });
  }

  const fragment = phone.replace(/\D/g, "").slice(-9);
  if (fragment.length >= 6) {
    const fuzzy = await prisma.employee.findMany({
      where: { phone: { contains: fragment } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        passwordHash: true,
        siteId: true,
        company: { select: { name: true } },
      },
    });
    console.log(`\nFuzzy match (BDD contient "${fragment}") : ${fuzzy.length}`);
    for (const e of fuzzy) {
      console.log("  -", {
        id: e.id,
        nom: `${e.firstName} ${e.lastName}`,
        phoneEnBDD: e.phone,
        isActive: e.isActive,
        hasPasswordHash: !!e.passwordHash,
        siteId: e.siteId,
        company: e.company.name,
      });
    }

    if (fuzzy.length > allMatches.length) {
      console.log(
        "\n⚠️  BUG CONFIRMÉ : la BDD contient un employé avec ce numéro, mais les variants générés NE LE TROUVENT PAS.",
      );
      console.log("   → Il faut corriger generatePhoneVariants().");
    }

    for (const e of fuzzy) {
      if (e.passwordHash) {
        const ok = verifyPassword(password, e.passwordHash);
        console.log(
          `\nTest mot de passe sur ${e.firstName} ${e.lastName} (${e.phone}) : ${ok ? "✅ MATCH" : "❌ pas de match"}`,
        );
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
