import { NextRequest, NextResponse } from "next/server";

import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-chariow-signature") ?? "";

    const isValid = chariowService.verifyWebhookSignature(body, signature);
    if (!isValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = chariowService.parseWebhookEvent(body);
    const companyId = event.data.metadata?.company_id;

    if (!companyId) {
      return NextResponse.json({ error: "Missing company_id" }, { status: 400 });
    }

    switch (event.type) {
      case "sale.completed":
      case "payment.success":
        await billingService.handlePaymentSuccess(
          companyId,
          event.data.amount,
          event.data.id,
        );
        break;

      case "sale.failed":
      case "payment.failed":
        await billingService.handlePaymentFailed(companyId, event.data.id);
        break;

      default:
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
