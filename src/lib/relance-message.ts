/**
 * Message de relance de paiement (client bloqué) — texte partagé entre la page
 * « Diagnostic Chariow » et la page « Transactions » du super-admin.
 *
 * Le message est destiné au PROPRIÉTAIRE de l'entreprise et contient le lien de
 * paiement (checkout) pour qu'il reprenne son règlement. Pur (aucune dépendance
 * serveur) → importable côté client comme côté serveur.
 */

export const RELANCE_SUPPORT_PHONE = "+2250778030075";
export const RELANCE_SUPPORT_EMAIL = "ocontrolesupoport@gmail.com";
export const RELANCE_APP_NAME = "OControle";
const BILLING_FALLBACK_URL = "ocontrole.com/dashboard/billing";

export function buildRelanceMessage(params: {
  /** Prénom du destinataire (propriétaire). */
  firstName?: string | null;
  /** Libellé du plan (ex. « Growth »). */
  planLabel?: string | null;
  /** Cycle de facturation, pour préciser mensuel/annuel. */
  cycle?: "MONTHLY" | "YEARLY" | string | null;
  /** Lien de paiement sécurisé (checkout Chariow). */
  checkoutUrl?: string | null;
}): string {
  const firstName = params.firstName?.trim() || "cher client";
  const planLabel = params.planLabel?.trim() || "votre abonnement";
  const cycle =
    params.cycle === "YEARLY"
      ? "annuel"
      : params.cycle === "MONTHLY"
        ? "mensuel"
        : "";
  const cycleSuffix = cycle ? ` (${cycle})` : "";
  const link = params.checkoutUrl?.trim() || "";

  return `Bonjour ${firstName},

Nous avons remarqué que votre paiement pour l'abonnement ${planLabel}${cycleSuffix} sur ${RELANCE_APP_NAME} n'a pas pu être finalisé.

Pas d'inquiétude, vous pouvez reprendre votre paiement directement via ce lien sécurisé :
${link || `(lien indisponible — merci de revenir sur ${BILLING_FALLBACK_URL})`}

Si vous rencontrez le moindre problème, notre équipe est là pour vous aider :
WhatsApp : ${RELANCE_SUPPORT_PHONE}
Email : ${RELANCE_SUPPORT_EMAIL}

À très vite,
L'équipe ${RELANCE_APP_NAME}`;
}
