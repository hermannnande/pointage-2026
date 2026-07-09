import { NextRequest, NextResponse } from "next/server";
import type { BillingCycle } from "@prisma/client";

import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";
import {
  sendPaymentSuccessWhatsApp,
  sendPaymentFailedWhatsApp,
  sendCheckoutAbandonedWhatsApp,
} from "@/services/whatsapp.service";

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

    // Authentification du webhook : Chariow (Pulse) N'ENVOIE PAS de signature
    // HMAC — le secret partagé se met dans l'URL (`?secret=…`), comme pour nos
    // autres boutiques. On compare donc le paramètre `secret` de l'URL à
    // CHARIOW_WEBHOOK_SECRET (timing-safe). Si la variable n'est pas définie,
    // on laisse passer (rétro-compatibilité, avec un avertissement).
    const expectedSecret = process.env.CHARIOW_WEBHOOK_SECRET ?? "";
    if (expectedSecret) {
      const provided = new URL(req.url).searchParams.get("secret") ?? "";
      if (!chariowService.safeSecretEquals(provided, expectedSecret)) {
        console.error("Chariow webhook: secret invalide ou absent dans l'URL");
        return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
      }
    } else {
      console.warn(
        "Chariow webhook: CHARIOW_WEBHOOK_SECRET non configuré — secret non vérifié. À configurer dès que possible.",
      );
    }

    const payload: ChariowPulsePayload = JSON.parse(body);
    const eventType = payload.event;
    const sale = payload.sale;

    let companyId = sale?.custom_metadata?.company_id;

    // Fallback : si pas de company_id en metadata, on tente via l'email du
    // customer (Chariow ne renvoie pas toujours la metadata dans les webhooks
    // mobile money RDC). Sans ce fallback, le paiement est perdu.
    if (!companyId && payload.customer?.email) {
      const { prisma } = await import("@/lib/prisma/client");
      const ownerMembership = await prisma.membership.findFirst({
        where: {
          isOwner: true,
          isActive: true,
          user: {
            email: { equals: payload.customer.email, mode: "insensitive" },
          },
        },
        select: { companyId: true },
      });
      companyId = ownerMembership?.companyId;
    }

    if (!companyId) {
      console.error("Webhook: company_id introuvable (metadata + fallback email)", payload);
      return NextResponse.json({ error: "Missing company_id" }, { status: 400 });
    }

    console.log(`Chariow pulse: ${eventType} | sale=${sale?.id} | company=${companyId}`);

    switch (eventType) {
      case "successful.sale":
      case "settled.sale":
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
        // WhatsApp de confirmation (idempotent par saleId, non-bloquant).
        await sendPaymentSuccessWhatsApp({
          companyId,
          saleId: sale?.id ?? "",
          amount: sale?.amount?.value,
          currency: sale?.amount?.currency,
        });
        break;

      case "failed.sale":
        await billingService.handlePaymentFailed(companyId, sale?.id);
        // WhatsApp d'aide : explique les causes fréquentes d'échec et
        // propose un accompagnement pas à pas (idempotent par saleId).
        await sendPaymentFailedWhatsApp({ companyId, saleId: sale?.id });
        break;

      case "abandoned.sale":
        console.log(`Sale abandonnée: ${sale?.id}`);
        // WhatsApp d'accompagnement : le client a démarré le paiement sans
        // le finaliser — on lui propose de l'aide (idempotent par saleId).
        await sendCheckoutAbandonedWhatsApp({ companyId, saleId: sale?.id });
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
