import { APP_URL, DEFAULT_COUNTRY } from "@/lib/constants";
import { getCountryFromPhone, getLocalPhoneNumber } from "@/lib/phone-country";

const CHARIOW_API_URL =
  process.env.CHARIOW_API_URL || "https://api.chariow.com/v1";
const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY || "";
const CHARIOW_WEBHOOK_SECRET = process.env.CHARIOW_WEBHOOK_SECRET || "";

function getPublicAppUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : undefined,
    "https://www.ocontrole.com",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (process.env.NODE_ENV === "production" && url.hostname === "localhost") {
        continue;
      }
      return url.origin;
    } catch {
      continue;
    }
  }
  return "https://www.ocontrole.com";
}

const PRODUCT_IDS: Record<string, string | undefined> = {
  starter_MONTHLY: process.env.CHARIOW_PRODUCT_STARTER_MONTHLY,
  starter_YEARLY: process.env.CHARIOW_PRODUCT_STARTER_YEARLY,
  growth_MONTHLY: process.env.CHARIOW_PRODUCT_GROWTH_MONTHLY,
  growth_YEARLY: process.env.CHARIOW_PRODUCT_GROWTH_YEARLY,
  business_MONTHLY: process.env.CHARIOW_PRODUCT_BUSINESS_MONTHLY,
  business_YEARLY: process.env.CHARIOW_PRODUCT_BUSINESS_YEARLY,
};

export function getChariowProductId(
  planSlug: string,
  billingCycle: string,
): string | null {
  return PRODUCT_IDS[`${planSlug}_${billingCycle}`] || null;
}

interface ChariowCheckoutParams {
  companyId: string;
  planId: string;
  planSlug: string;
  planName: string;
  billingCycle: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  /** Téléphone de l'entreprise utilisé en fallback si le user n'en a pas */
  companyPhone?: string | null;
  /**
   * Code pays ISO 3166-1 alpha-2 (CI, SN, CM, FR, …).
   * Si fourni, Chariow pré-remplit le pays au checkout — pas de sélection manuelle.
   */
  country?: string;
}

export interface ChariowSale {
  id: string;
  status: string;
  amount?: {
    value: number;
    currency: string;
    formatted?: string;
  };
  payment?: {
    status?: string;
    checkout_url?: string;
  };
  custom_metadata?: {
    company_id?: string;
    plan_id?: string;
    plan_slug?: string;
    billing_cycle?: string;
  };
  product?: {
    id?: string;
    name?: string;
    slug?: string;
  };
  customer?: {
    id?: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    country?: string;
    name?: string;
  };
  store?: {
    id?: string;
    name?: string;
    url?: string;
  };
  checkout?: {
    url?: string;
  };
  completed_at?: string | null;
  created_at?: string | null;
  abandoned_at?: string | null;
  failed_at?: string | null;
}

export function getPlanFromProductId(
  productId: string,
): { planSlug: string; billingCycle: "MONTHLY" | "YEARLY" } | null {
  for (const [key, value] of Object.entries(PRODUCT_IDS)) {
    if (value !== productId) continue;
    const [planSlug, billingCycle] = key.split("_");
    if (!planSlug || (billingCycle !== "MONTHLY" && billingCycle !== "YEARLY")) {
      continue;
    }
    return { planSlug, billingCycle };
  }
  return null;
}

export async function createCheckoutSession(params: ChariowCheckoutParams) {
  const {
    companyId,
    planId,
    planSlug,
    planName,
    billingCycle,
    customerEmail,
    customerName,
    customerPhone,
    companyPhone,
    country,
  } = params;

  if (!CHARIOW_API_KEY) {
    throw new Error(
      "Clé API Chariow non configurée. Ajoutez CHARIOW_API_KEY dans les variables d'environnement.",
    );
  }

  const productId = getChariowProductId(planSlug, billingCycle);
  if (!productId) {
    throw new Error(
      `Produit Chariow non configuré pour le plan "${planName}" (${billingCycle}). ` +
        `Ajoutez CHARIOW_PRODUCT_${planSlug.toUpperCase()}_${billingCycle} dans les variables d'environnement.`,
    );
  }

  const nameParts = customerName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Client";
  const lastName = nameParts.slice(1).join(" ") || "OControle";

  // Téléphone : user > entreprise > placeholder (Chariow exige TOUJOURS le bloc phone).
  // Pour éviter "Invalid phone number" : le country_code Chariow doit
  // OBLIGATOIREMENT correspondre au préfixe du numéro envoyé.
  // On déduit donc le country_code depuis le téléphone lui-même, et on n'utilise
  // le `country` (paramètre) qu'en fallback (numéro local sans préfixe).
  const rawPhone = customerPhone?.trim() || companyPhone?.trim() || "";
  const localDigits = getLocalPhoneNumber(rawPhone).replace(/\D/g, "");
  const phoneNumber = localDigits.length >= 6 ? localDigits : "0000000000";

  const phoneCountry = getCountryFromPhone(rawPhone);
  const countryCode = (phoneCountry ?? country ?? DEFAULT_COUNTRY).toUpperCase();

  const publicAppUrl = getPublicAppUrl();

  const payload: Record<string, unknown> = {
    product_id: productId,
    email: customerEmail,
    first_name: firstName,
    last_name: lastName,
    phone: {
      number: phoneNumber,
      country_code: countryCode,
    },
    redirect_url: `${publicAppUrl}/dashboard/billing/success?sale_id={sale_id}`,
    custom_metadata: {
      company_id: companyId,
      plan_id: planId,
      plan_slug: planSlug,
      billing_cycle: billingCycle,
    },
  };

  console.log("Chariow checkout request:", JSON.stringify(payload, null, 2));

  const response = await fetch(`${CHARIOW_API_URL}/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHARIOW_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Chariow checkout error:", response.status, errorBody);

    let userMessage = "Erreur lors du paiement.";
    try {
      const parsed = JSON.parse(errorBody);
      if (parsed.message) userMessage = parsed.message;
      if (parsed.errors) {
        const fieldErrors = Object.values(parsed.errors).flat();
        if (fieldErrors.length > 0) {
          userMessage = fieldErrors.join(". ");
        }
      }
    } catch {
      // keep default message
    }
    throw new Error(userMessage);
  }

  const result = await response.json();
  const data = result.data;

  if (data.step === "payment" && data.payment?.checkout_url) {
    return {
      saleId: data.purchase?.id as string,
      checkoutUrl: data.payment.checkout_url as string,
    };
  }

  if (data.step === "completed") {
    return {
      saleId: data.purchase?.id as string,
      checkoutUrl: `${publicAppUrl}/dashboard/billing/success?session_id=${data.purchase?.id}`,
    };
  }

  if (data.step === "already_purchased") {
    throw new Error("Ce plan a déjà été acheté.");
  }

  throw new Error("Réponse inattendue de Chariow");
}

export function verifyWebhookSignature(
  payload: string,
  signature: string,
): boolean {
  if (!CHARIOW_WEBHOOK_SECRET) return false;

  try {
    const crypto = require("crypto") as typeof import("crypto");
    const expected = crypto
      .createHmac("sha256", CHARIOW_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

export interface ChariowWebhookEvent {
  type: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    metadata?: {
      company_id?: string;
      plan_slug?: string;
      billing_cycle?: string;
    };
    custom_metadata?: {
      company_id?: string;
      plan_slug?: string;
      billing_cycle?: string;
    };
  };
}

export function parseWebhookEvent(body: string): ChariowWebhookEvent {
  const raw = JSON.parse(body);
  const event = raw as ChariowWebhookEvent;
  if (event.data?.custom_metadata && !event.data.metadata) {
    event.data.metadata = event.data.custom_metadata;
  }
  return event;
}

export async function getSale(saleId: string): Promise<ChariowSale> {
  if (!CHARIOW_API_KEY) {
    throw new Error("Clé API Chariow non configurée.");
  }
  const response = await fetch(`${CHARIOW_API_URL}/sales/${saleId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CHARIOW_API_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Impossible de récupérer la vente Chariow (${response.status}) ${body}`);
  }

  const parsed = await response.json();
  return parsed.data as ChariowSale;
}

export async function listSales(limit = 50): Promise<ChariowSale[]> {
  if (!CHARIOW_API_KEY) {
    throw new Error("Clé API Chariow non configurée.");
  }
  const response = await fetch(`${CHARIOW_API_URL}/sales?per_page=${limit}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${CHARIOW_API_KEY}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Impossible de lister les ventes Chariow (${response.status}) ${body}`);
  }

  const parsed = await response.json();
  return (parsed.data ?? []) as ChariowSale[];
}
