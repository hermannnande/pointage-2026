/**
 * Tests manuels de generatePhoneVariants pour valider le fix.
 */
import { generatePhoneVariants } from "@/lib/phone-variants";

const cases = [
  { input: "+225745345063", mustContain: ["0745345063", "745345063"] },
  { input: "0745345063", mustContain: ["0745345063", "745345063"] },
  { input: "745345063", mustContain: ["0745345063", "745345063"] },
  { input: "+33612345678", mustContain: ["0612345678", "612345678"] },
  { input: "0612345678", mustContain: ["0612345678", "612345678"] },
  { input: "+1 415 555 1234".replace(/\s/g, ""), mustContain: ["4155551234", "04155551234"] },
  { input: "+2250778030075", mustContain: ["0778030075", "778030075"] },
  { input: "+229 67 12 34 56".replace(/\s/g, ""), mustContain: ["67123456", "067123456"] },
];

let pass = 0;
let fail = 0;

for (const { input, mustContain } of cases) {
  const variants = generatePhoneVariants(input);
  const missing = mustContain.filter((m) => !variants.includes(m));
  if (missing.length === 0) {
    pass++;
    console.log(`✅ ${input} → contient bien ${JSON.stringify(mustContain)}`);
  } else {
    fail++;
    console.log(`❌ ${input} → MANQUE ${JSON.stringify(missing)}. Variants: ${JSON.stringify(variants)}`);
  }
}

console.log(`\n${pass}/${pass + fail} tests passés.`);
process.exit(fail > 0 ? 1 : 0);
