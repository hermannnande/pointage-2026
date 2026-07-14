import { NextRequest, NextResponse } from "next/server";
import type { BillingCycle } from "@prisma/client";

import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendCheckoutAbandonedEmail,
} from "@/services/billing-email.service";

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

// Chariow valide parfois l'URL du Pulse via une requête GET (health-check).
// On répond 200 pour ne pas provoquer une désactivation du Pulse.
export async function GET() {
  return NextResponse.json({ ok: true });
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
      // On ne peut pas rattacher ce paiement à une entreprise (pas de metadata
      // ET email inconnu). On ACCUSE quand même réception (200) : un webhook qui
      // renvoie 4xx finit désactivé par Chariow. Le cas est journalisé pour
      // réconciliation manuelle via l'API Chariow (listSales/getSale).
      console.error(
        "Webhook Chariow: company_id introuvable (metadata + fallback email) — ACK 200 pour ne pas désactiver le Pulse",
        JSON.stringify({ event: eventType, saleId: sale?.id, email: payload.customer?.email }),
      );
      return NextResponse.json({ received: true, unmatched: true });
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
        // Email de confirmation (idempotent par saleId, non-bloquant).
        await sendPaymentSuccessEmail({
          companyId,
          saleId: sale?.id ?? "",
          amount: sale?.amount?.value,
          currency: sale?.amount?.currency,
        });
        break;

      case "failed.sale":
        await billingService.handlePaymentFailed(companyId, sale?.id);
        // Email d'aide : explique les causes fréquentes d'échec et propose
        // un accompagnement pas à pas via WhatsApp (idempotent par saleId).
        await sendPaymentFailedEmail({ companyId, saleId: sale?.id });
        break;

      case "abandoned.sale":
        console.log(`Sale abandonnée: ${sale?.id}`);
        // Email d'accompagnement : le client a démarré le paiement sans le
        // finaliser — on lui propose de l'aide (idempotent par saleId).
        await sendCheckoutAbandonedEmail({ companyId, saleId: sale?.id });
        break;

      default:
        console.log(`Événement Chariow non géré: ${eventType}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    // On journalise l'erreur mais on ACCUSE réception (200). Chariow désactive
    // le Pulse après quelques réponses non-2xx ; mieux vaut réconcilier ensuite
    // via l'API Chariow que de perdre le webhook. (Note : l'auth par secret, si
    // elle échoue, renvoie 401 avant d'arriver ici — c'est le seul rejet voulu.)
    console.error("Webhook Chariow error (ACK 200 volontaire):", err);
    return NextResponse.json({ received: true, error: true });
  }
}
