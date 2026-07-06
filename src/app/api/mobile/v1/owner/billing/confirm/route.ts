/**
 * POST /api/mobile/v1/owner/billing/confirm
 *
 * Confirme une vente Chariow depuis l'app mobile (appelé au retour du
 * navigateur, quand l'app repasse au premier plan). Miroir de
 * `confirmSaleFromReturnAction` du web.
 *
 * Body : { saleId }
 * Réponse : { paymentStatus: "success" | "pending" | "failed" }
 *
 * NB : le webhook Chariow reste la source d'activation principale — cette
 * route est un filet de sécurité + un moyen pour l'app d'afficher le
 * résultat immédiatement.
 */

import { z } from "zod";

import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const confirmSchema = z.object({
  saleId: z.string().min(1),
});

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseAndValidateBody(request, confirmSchema);
  if (!parsed.ok) return parsed.response;

  const ctx = auth.tenant;
  const { saleId } = parsed.data;

  try {
    const sale = await chariowService.getSale(saleId);
    const meta = sale.custom_metadata ?? {};

    if (meta.company_id && meta.company_id !== ctx.companyId) {
      return errors.forbidden("Cette vente ne correspond pas à votre entreprise.");
    }
    if (!meta.company_id) {
      const customerEmail = sale.customer?.email?.toLowerCase();
      if (!customerEmail || customerEmail !== ctx.user.email.toLowerCase()) {
        return errors.forbidden("Cette vente ne correspond pas à votre compte.");
      }
    }

    if (chariowService.isSalePaid(sale)) {
      await billingService.handlePaymentSuccess(
        ctx.companyId,
        sale.amount?.value ?? 0,
        sale.id,
        {
          planId: meta.plan_id,
          planSlug: meta.plan_slug,
          billingCycle:
            meta.billing_cycle === "YEARLY" || meta.billing_cycle === "MONTHLY"
              ? meta.billing_cycle
              : undefined,
        },
      );
      return ok({ paymentStatus: "success" });
    }

    if (chariowService.isSaleFailed(sale)) {
      await billingService.handlePaymentFailed(ctx.companyId, sale.id);
      return ok({ paymentStatus: "failed" });
    }

    return ok({ paymentStatus: "pending" });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Impossible de confirmer le paiement";
    return errors.upstreamError(message);
  }
}

export const OPTIONS = preflight;
