import { APP_URL } from "@/lib/constants";

const CHARIOW_API_URL = process.env.CHARIOW_API_URL || "https://api.chariow.com/v1";
const CHARIOW_SECRET_KEY = process.env.CHARIOW_SECRET_KEY || "";
const CHARIOW_WEBHOOK_SECRET = process.env.CHARIOW_WEBHOOK_SECRET || "";

interface ChariowCheckoutParams {
  companyId: string;
  planName: string;
  amount: number;
  currency: string;
  billingCycle: string;
  customerEmail: string;
  customerName: string;
}

export async function createCheckoutSession(params: ChariowCheckoutParams) {
  const { companyId, planName, amount, currency, billingCycle, customerEmail, customerName } = params;

  const response = await fetch(`${CHARIOW_API_URL}/sales`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${CHARIOW_SECRET_KEY}`,
    },
    body: JSON.stringify({
      amount,
      currency,
      description: `PointSync — ${planName} (${billingCycle === "YEARLY" ? "Annuel" : "Mensuel"})`,
      customer_email: customerEmail,
      customer_name: customerName,
      metadata: {
        company_id: companyId,
        plan_name: planName,
        billing_cycle: billingCycle,
      },
      success_url: `${APP_URL}/dashboard/billing/success?session_id={sale_id}`,
      cancel_url: `${APP_URL}/dashboard/billing/cancel`,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chariow API error: ${response.status} — ${errorBody}`);
  }

  const data = await response.json();
  return {
    saleId: data.id as string,
    checkoutUrl: data.checkout_url as string,
  };
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
      plan_name?: string;
      billing_cycle?: string;
    };
  };
}

export function parseWebhookEvent(body: string): ChariowWebhookEvent {
  return JSON.parse(body) as ChariowWebhookEvent;
}
