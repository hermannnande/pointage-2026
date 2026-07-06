/**
 * POST /api/mobile/v1/owner/billing/checkout
 *
 * Crée une session de paiement Chariow DEPUIS l'app mobile (checkout natif,
 * sans re-login web). L'app ouvre ensuite `checkoutUrl` dans le navigateur :
 * c'est directement la page de paiement Chariow, qui affiche les moyens de
 * paiement du pays du client (mobile money, carte…).
 *
 * Body : { planId, billingCycle: "MONTHLY"|"YEARLY",
 *          phoneOverride?: "+2250778030075", countryOverride?: "CI" }
 *
 * Règle « bonnes options de paiement » : Chariow exige que `country_code`
 * corresponde au préfixe du numéro. Si ni le user ni l'entreprise n'ont de
 * téléphone et qu'aucun override n'est fourni, on renvoie l'erreur
 * PHONE_REQUIRED (422) — l'app affiche alors un dialog téléphone+indicatif
 * puis retente. Le téléphone fourni est sauvegardé sur le profil user.
 *
 * Réponse : { saleId, checkoutUrl }
 */

import { z } from "zod";

import { prisma } from "@/lib/prisma/client";
import * as billingService from "@/services/billing.service";
import * as chariowService from "@/services/chariow.service";
import { detectCountry } from "@/services/geo.service";
import { requirePermission } from "@/services/tenant.service";
import { PERMISSIONS } from "@/config/permissions";

import { err, errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const checkoutSchema = z.object({
  planId: z.string().min(1),
  billingCycle: z.enum(["MONTHLY", "YEARLY"]),
  phoneOverride: z.string().trim().optional(),
  countryOverride: z.string().trim().length(2).optional(),
});

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseAndValidateBody(request, checkoutSchema);
  if (!parsed.ok) return parsed.response;

  const ctx = auth.tenant;
  const { planId, billingCycle, phoneOverride, countryOverride } = parsed.data;

  try {
    requirePermission(ctx, PERMISSIONS.BILLING_MANAGE);
  } catch {
    return errors.forbidden(
      "Seul le propriétaire ou un administrateur peut gérer l'abonnement.",
    );
  }

  try {
    const plan = await billingService.validatePlanChange(ctx.companyId, planId);

    // Téléphone effectif : override (dialog mobile) > profil user > entreprise.
    let effectivePhone = ctx.user.phone ?? null;
    if (phoneOverride && phoneOverride.replace(/\D/g, "").length >= 8) {
      effectivePhone = phoneOverride;
      // Sauvegarde sur le profil pour ne plus redemander (comme le web).
      await prisma.user
        .update({ where: { id: ctx.userId }, data: { phone: phoneOverride } })
        .catch(() => undefined);
    }
    const phoneForCheckout = effectivePhone ?? ctx.company.phone ?? null;

    // Sans téléphone, Chariow ne peut pas proposer les bons moyens de
    // paiement (mobile money = numéro du pays). On exige le dialog côté app.
    if (!phoneForCheckout || phoneForCheckout.replace(/\D/g, "").length < 8) {
      return err(
        "PHONE_REQUIRED",
        "Numéro de téléphone requis pour le paiement (mobile money).",
        { status: 422 },
      );
    }

    // Pays : override explicite > pays entreprise > IP > préfixe téléphone > CI.
    // NB : createCheckoutSession re-priorise le préfixe du téléphone pour
    // garantir la cohérence country_code ↔ numéro exigée par Chariow.
    const country = await detectCountry({
      override: countryOverride,
      companyCountry: ctx.company.country,
      phone: phoneForCheckout,
    });

    // Même helper validé que le web : jamais de localhost ni d'URL
    // malformée dans redirect_url (sinon Chariow rejette la vente).
    const publicUrl = chariowService.getPublicAppUrl();
    const { saleId, checkoutUrl } = await chariowService.createCheckoutSession({
      companyId: ctx.companyId,
      planId: plan.id,
      planSlug: plan.slug,
      planName: plan.name,
      billingCycle,
      customerEmail: ctx.user.email,
      customerName: ctx.user.fullName,
      customerPhone: phoneForCheckout,
      companyPhone: ctx.company.phone,
      country,
      // Page PUBLIQUE (pas de login web) : l'utilisateur vient de l'app.
      redirectUrl: `${publicUrl}/billing/success-mobile?sale_id={sale_id}`,
    });

    await billingService.recordPaymentInitiated({
      companyId: ctx.companyId,
      chariowSaleId: saleId,
      planId: plan.id,
      planName: plan.name,
      planSlug: plan.slug,
      billingCycle,
    });

    return ok({ saleId, checkoutUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur de paiement";
    return errors.unprocessable(message);
  }
}

export const OPTIONS = preflight;
