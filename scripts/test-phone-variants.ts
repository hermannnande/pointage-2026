/**
 * Tests exhaustifs de generatePhoneVariants pour TOUS les pays
 * du sélecteur d'indicatif de l'app mobile + cas internationaux.
 *
 * Pour chaque pays, on simule :
 *   - Le proprio crée l'employé avec un numéro local (ex "0745345063" en CI)
 *   - L'employé tape sur l'APK soit le local, soit le format international
 *   - L'API doit générer des variants qui matchent le numéro stocké en BDD.
 */
import { generatePhoneVariants } from "@/lib/phone-variants";

interface Case {
  country: string;
  dial: string;          // indicatif international ("+225")
  ccLen: number;         // longueur de l'indicatif (1, 2, 3 ou 4)
  localWithLeadingZero: string; // ce que stocke en BDD le proprio "0XXXXXXXXX"
  localWithoutLeadingZero: string; // équivalent sans le 0 initial "XXXXXXXXX"
}

// Pays présents dans le sélecteur de l'app mobile (employee_login_page.dart)
// + quelques cas internationaux à 1, 2, 4 chiffres pour la couverture.
const cases: Case[] = [
  // --- Codes pays à 3 chiffres (Afrique) ---
  { country: "Côte d'Ivoire", dial: "+225", ccLen: 3, localWithLeadingZero: "0745345063", localWithoutLeadingZero: "745345063" },
  { country: "Sénégal",       dial: "+221", ccLen: 3, localWithLeadingZero: "0771234567", localWithoutLeadingZero: "771234567" },
  { country: "Bénin",         dial: "+229", ccLen: 3, localWithLeadingZero: "067123456", localWithoutLeadingZero: "67123456" },
  { country: "Togo",          dial: "+228", ccLen: 3, localWithLeadingZero: "091234567", localWithoutLeadingZero: "91234567" },
  { country: "Burkina Faso",  dial: "+226", ccLen: 3, localWithLeadingZero: "070123456", localWithoutLeadingZero: "70123456" },
  { country: "Mali",          dial: "+223", ccLen: 3, localWithLeadingZero: "076123456", localWithoutLeadingZero: "76123456" },
  { country: "Niger",         dial: "+227", ccLen: 3, localWithLeadingZero: "090123456", localWithoutLeadingZero: "90123456" },
  { country: "Cameroun",      dial: "+237", ccLen: 3, localWithLeadingZero: "0691234567", localWithoutLeadingZero: "691234567" },
  { country: "Gabon",         dial: "+241", ccLen: 3, localWithLeadingZero: "077123456", localWithoutLeadingZero: "77123456" },
  { country: "Congo",         dial: "+242", ccLen: 3, localWithLeadingZero: "061234567", localWithoutLeadingZero: "61234567" },
  { country: "RD Congo",      dial: "+243", ccLen: 3, localWithLeadingZero: "0812345678", localWithoutLeadingZero: "812345678" },
  { country: "Guinée",        dial: "+224", ccLen: 3, localWithLeadingZero: "0621234567", localWithoutLeadingZero: "621234567" },
  { country: "Maroc",         dial: "+212", ccLen: 3, localWithLeadingZero: "0612345678", localWithoutLeadingZero: "612345678" },
  { country: "Ghana",         dial: "+233", ccLen: 3, localWithLeadingZero: "0241234567", localWithoutLeadingZero: "241234567" },
  { country: "Nigéria",       dial: "+234", ccLen: 3, localWithLeadingZero: "08012345678", localWithoutLeadingZero: "8012345678" },
  // --- Codes pays à 2 chiffres (international) ---
  { country: "France",        dial: "+33",  ccLen: 2, localWithLeadingZero: "0612345678", localWithoutLeadingZero: "612345678" },
  { country: "Allemagne",     dial: "+49",  ccLen: 2, localWithLeadingZero: "01512345678", localWithoutLeadingZero: "1512345678" },
  { country: "UK",            dial: "+44",  ccLen: 2, localWithLeadingZero: "07911123456", localWithoutLeadingZero: "7911123456" },
  // --- Code pays à 1 chiffre ---
  { country: "USA/Canada",    dial: "+1",   ccLen: 1, localWithLeadingZero: "04155551234", localWithoutLeadingZero: "4155551234" },
  // --- Code pays à 4 chiffres ---
  { country: "Bahamas",       dial: "+1242", ccLen: 4, localWithLeadingZero: "0123456", localWithoutLeadingZero: "123456" },
];

let pass = 0;
let fail = 0;

for (const c of cases) {
  // L'app mobile envoie en intl si l'utilisateur tape juste le local : dial + local sans 0
  const intlSent = `${c.dial}${c.localWithoutLeadingZero}`;
  const intl00Sent = `00${c.dial.substring(1)}${c.localWithoutLeadingZero}`;
  const localSent = c.localWithLeadingZero;

  // Pour chaque format envoyé par l'APK, on doit générer des variants
  // qui contiennent les 2 formats que le proprio peut avoir saisis en BDD
  // (avec ou sans le 0 initial).
  const expectedInBDD = [c.localWithLeadingZero, c.localWithoutLeadingZero];

  for (const sent of [intlSent, intl00Sent, localSent, c.localWithoutLeadingZero]) {
    const variants = generatePhoneVariants(sent);
    const missing = expectedInBDD.filter((m) => !variants.includes(m));
    if (missing.length === 0) {
      pass++;
    } else {
      fail++;
      console.log(
        `❌ ${c.country} (${c.dial}) | envoyé "${sent}" | BDD pourrait être ${JSON.stringify(expectedInBDD)} | MANQUE ${JSON.stringify(missing)}`,
      );
      console.log(`   Variants : ${JSON.stringify(variants)}\n`);
    }
  }
}

console.log(`\n${pass}/${pass + fail} sous-tests passés (${cases.length} pays × 4 formats envoyés).`);
process.exit(fail > 0 ? 1 : 0);
