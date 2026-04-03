import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "node:crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });
const SAFE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function generateCode(): string {
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return code;
}

async function main() {
  const sites = await prisma.site.findMany({ where: { code: null } });
  console.log(`${sites.length} site(s) sans code trouvé(s).`);

  for (const site of sites) {
    let code = generateCode();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await prisma.site.findUnique({ where: { code } });
      if (!exists) break;
      code = generateCode();
      attempts++;
    }
    await prisma.site.update({ where: { id: site.id }, data: { code } });
    console.log(`  Site "${site.name}" → code: ${code}`);
  }

  console.log("Terminé.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
