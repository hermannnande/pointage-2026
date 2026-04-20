/**
 * Génère toutes les variantes raisonnables d'un numéro de téléphone afin
 * de tolérer les différents formats de saisie (web local "0XXXXXXXXX" vs.
 * mobile international "+225XXXXXXXXX") au moment de la recherche en base.
 *
 * Exemples (entrée -> sorties incluses) :
 *   "0612345678"      -> ["0612345678", "612345678"]
 *   "+225612345678"   -> ["+225612345678", "612345678", "0612345678", "00225612345678"]
 *   "00225612345678"  -> ["00225612345678", "612345678", "0612345678", "+225612345678"]
 *   "612345678"       -> ["612345678", "0612345678"]
 */
export function generatePhoneVariants(input: string): string[] {
  const trimmed = input.trim().replace(/\s+/g, "");
  if (!trimmed) return [];

  const variants = new Set<string>();
  variants.add(trimmed);

  const intlMatch = trimmed.match(/^\+(\d{1,4})(\d{6,})$/);
  if (intlMatch) {
    const localDigits = intlMatch[2];
    variants.add(localDigits);
    variants.add("0" + localDigits);
    variants.add("00" + intlMatch[1] + localDigits);
  }

  const altIntlMatch = trimmed.match(/^00(\d{1,4})(\d{6,})$/);
  if (altIntlMatch) {
    const localDigits = altIntlMatch[2];
    variants.add(localDigits);
    variants.add("0" + localDigits);
    variants.add("+" + altIntlMatch[1] + localDigits);
  }

  if (trimmed.startsWith("0") && !trimmed.startsWith("00")) {
    variants.add(trimmed.substring(1));
  }

  if (/^\d{6,}$/.test(trimmed) && !trimmed.startsWith("0")) {
    variants.add("0" + trimmed);
  }

  return [...variants];
}
