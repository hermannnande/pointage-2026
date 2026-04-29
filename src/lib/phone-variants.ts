/**
 * Génère toutes les variantes raisonnables d'un numéro de téléphone afin
 * de tolérer les différents formats de saisie (web local "0XXXXXXXXX" vs.
 * mobile international "+225XXXXXXXXX") au moment de la recherche en base.
 *
 * Exemples (entrée -> sorties incluses) :
 *   "0745345063"      -> ["0745345063", "745345063"]
 *   "+225745345063"   -> ["+225745345063", "745345063", "0745345063",
 *                          "00225745345063", ...autres splits]
 *   "00225745345063"  -> idem
 *   "745345063"       -> ["745345063", "0745345063"]
 *
 * Notes :
 * - Les codes pays peuvent faire 1 à 4 chiffres (cf. UIT-T E.164).
 *   Pour ne pas dépendre d'une liste de codes pays, on génère toutes les
 *   coupures possibles : code = 1, 2, 3 ou 4 chiffres ; reste = local.
 *   Cela couvre tout le monde (CI=225, FR=33, US=1, etc.).
 * - On garantit la présence du numéro local seul ET avec un "0" devant,
 *   car selon les pays le format de stockage usuel diffère.
 */
export function generatePhoneVariants(input: string): string[] {
  const trimmed = input.trim().replace(/\s+/g, "");
  if (!trimmed) return [];

  const variants = new Set<string>();
  variants.add(trimmed);

  // Cas 1 : format international "+XXX..." → on essaie tous les splits
  // possibles du code pays (1 à 4 chiffres).
  const intlMatch = trimmed.match(/^\+(\d+)$/);
  if (intlMatch) {
    expandIntl(intlMatch[1], variants);
  }

  // Cas 2 : format international "00XXX..." (équivalent du "+")
  const altIntlMatch = trimmed.match(/^00(\d+)$/);
  if (altIntlMatch) {
    expandIntl(altIntlMatch[1], variants);
  }

  // Cas 3 : numéro local commençant par "0" → ajouter la version sans "0"
  if (trimmed.startsWith("0") && !trimmed.startsWith("00")) {
    variants.add(trimmed.substring(1));
  }

  // Cas 4 : numéro local sans "0" et sans "+" → ajouter la version "0XXX"
  if (/^\d{6,}$/.test(trimmed) && !trimmed.startsWith("0")) {
    variants.add("0" + trimmed);
  }

  return [...variants];
}

/**
 * Pour un numéro full-digits (sans le "+" ou le "00"), on essaie tous les
 * découpages possibles "code pays (1..4 chiffres) | local (>= 6 chiffres)"
 * et on enregistre les variantes les plus utiles :
 *   - local seul
 *   - "0" + local
 *   - "00" + code + local
 *   - "+" + code + local
 */
function expandIntl(allDigits: string, variants: Set<string>): void {
  for (let cc = 1; cc <= 4; cc++) {
    if (allDigits.length - cc < 6) continue; // local trop court

    const country = allDigits.slice(0, cc);
    const local = allDigits.slice(cc);

    variants.add(local);
    variants.add("0" + local);
    variants.add("+" + country + local);
    variants.add("00" + country + local);
  }
}
