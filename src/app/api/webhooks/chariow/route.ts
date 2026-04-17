import { NextRequest, NextResponse } from "next/server";
import type { BillingCycle } from "@prisma/client";

import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";

interface ChariowPulsePayload {
  event: string;
  sale?: {
    id: string;
    amount: {
      value: number;
      currency: string;
    };
    status: string;
    custom_metadata?: Record<string, string>;
  };
  product?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    email: string;
    name: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature =
      req.headers.get("x-chariow-signature") ??
      req.headers.get("x-webhook-signature") ??
      "";

    const hasSecret = !!process.env.CHARIOW_WEBHOOK_SECRET;

    if (hasSecret) {
      const isValid = chariowService.verifyWebhookSignature(body, signature);
      if (!isValid) {
        console.error("Chariow webhook: signature invalide", {
          hasSignature: !!signature,
          signatureLength: signature.length,
        });
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn(
        "Chariow webhook: CHARIOW_WEBHOOK_SECRET non configuré — signature non vérifiée. À configurer dès que possible.",
      );
    }

    const payload: ChariowPulsePayload = JSON.parse(body);
    const eventType = payload.event;
    const sale = payload.sale;

    const companyId = sale?.custom_metadata?.company_id;

    if (!companyId) {
      console.error("Webhook: company_id manquant dans custom_metadata", payload);
      return NextResponse.json({ error: "Missing company_id" }, { status: 400 });
    }

    console.log(`Chariow pulse: ${eventType} | sale=${sale?.id} | company=${companyId}`);

    switch (eventType) {
      case "successful.sale":
        await billingService.handlePaymentSuccess(
          companyId,
          sale?.amount?.value ?? 0,
          sale?.id ?? "",
          {
            planId: sale?.custom_metadata?.plan_id,
            planSlug: sale?.custom_metadata?.plan_slug,
            billingCycle: sale?.custom_metadata?.billing_cycle
              ? (sale.custom_metadata.billing_cycle as BillingCycle)
              : undefined,
          },
        );
        break;

      case "failed.sale":
        await billingService.handlePaymentFailed(companyId, sale?.id);
        break;

      case "abandoned.sale":
        console.log(`Sale abandonnée: ${sale?.id}`);
        break;

      default:
        console.log(`Événement Chariow non géré: ${eventType}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook processing error" },
      { status: 500 },
    );
  }
}
