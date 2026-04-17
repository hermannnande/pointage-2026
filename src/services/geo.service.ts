import { headers } from "next/headers";

import { COUNTRIES, DEFAULT_COUNTRY } from "@/lib/constants";
import { getCountryFromPhone } from "@/lib/phone-country";

const VALID_COUNTRY_CODES = new Set(COUNTRIES.map((c) => c.code));

function isValidCountry(code: string | null | undefined): code is string {
  if (!code) return false;
  const upper = code.toUpperCase();
  return VALID_COUNTRY_CODES.has(upper as (typeof COUNTRIES)[number]["code"]);
}

/**
 * Récupère le pays détecté depuis les headers de la requête HTTP.
 * Priorité : Vercel > Cloudflare > x-country.
 *
 * Doit être appelée dans un contexte serveur (server action, route handler).
 */
export async function detectCountryFromRequest(): Promise<string | null> {
  try {
    const h = await headers();
    const candidates = [
      h.get("x-vercel-ip-country"),
      h.get("cf-ipcountry"),
      h.get("x-country"),
    ];
    for (const candidate of candidates) {
      if (isValidCountry(candidate)) {
        return candidate!.toUpperCase();
      }
    }
  } catch {
    // headers() peut throw si appelé hors contexte requête
  }
  return null;
}

interface DetectCountryParams {
  /** Pays défini sur l'entreprise lors de l'onboarding (priorité maximale) */
  companyCountry?: string | null;
  /** Numéro de téléphone international du user ou de l'entreprise */
  phone?: string | null;
  /** Code pays explicite passé manuellement (priorité absolue si fourni) */
  override?: string | null;
}

/**
 * Détecte le pays d'un client avec une cascade de fallbacks :
 *   1. override explicite
 *   2. companyCountry (DB)
 *   3. headers requête (IP via Vercel/Cloudflare)
 *   4. parsing du préfixe téléphone international
 *   5. DEFAULT_COUNTRY ("CI")
 *
 * Garantit toujours un code ISO 3166-1 alpha-2 valide en sortie.
 */
export async function detectCountry(
  params: DetectCountryParams = {},
): Promise<string> {
  const { override, companyCountry, phone } = params;

  if (isValidCountry(override)) return override.toUpperCase();
  if (isValidCountry(companyCountry)) return companyCountry.toUpperCase();

  const fromHeaders = await detectCountryFromRequest();
  if (fromHeaders) return fromHeaders;

  const fromPhone = getCountryFromPhone(phone);
  if (isValidCountry(fromPhone)) return fromPhone;

  return DEFAULT_COUNTRY;
}
