import { prisma } from "@/lib/prisma/client";
import { sendEmail } from "@/lib/email/send-email";

// ============================================================
// EMAILS DE RELANCE — Resend
// ============================================================
// Remplace les relances WhatsApp (numéro restreint par WhatsApp pour
// cause de messages sortants massifs). Les clients reçoivent désormais
// un email soigné, avec un bouton « Besoin d'aide ? WhatsApp » : c'est
// EUX qui initient la conversation → aucun risque pour le numéro.
//
//   1. Bienvenue à l'inscription (bienfaits + liens de téléchargement)
//   2. Rappel quotidien pendant les 3 derniers jours d'essai
//   3. Fin d'essai (jour J)
//   4. Suivi des paiements : confirmé / échoué / abandonné
//
// Chaque envoi est journalisé dans `email_messages` avec une `dedupeKey`
// unique → jamais deux fois le même message (crons et webhooks peuvent
// rejouer sans risque de spam). Un envoi FAILED est retentable.

const WEB_BILLING_URL = "https://www.ocontrole.com/dashboard/billing";
const WEB_LOGIN_URL = "https://www.ocontrole.com/login";
const APK_DOWNLOAD_URL = "https://www.ocontrole.com/download/apk";
const SUPPORT_PHONE_DISPLAY = "+225 07 78 03 00 75";
const SUPPORT_WHATSAPP_URL = (text: string) =>
  `https://wa.me/2250778030075?text=${encodeURIComponent(text)}`;

// ─── Layout HTML partagé (charte OControle : or / crème) ────

const GOLD = "#D4A017";
const WHATSAPP_GREEN = "#25D366";

function renderBillingEmail(params: {
  title: string;
  greeting: string;
  /** Paragraphes HTML (déjà échappés/renseignés par nos templates). */
  bodyHtml: string;
  cta?: { label: string; url: string };
  whatsappText: string;
}): string {
  const { title, greeting, bodyHtml, cta, whatsappText } = params;

  const ctaBlock = cta
    ? `<tr>
        <td align="center" style="padding-bottom:16px;">
          <a href="${cta.url}"
             style="display:inline-block;background-color:${GOLD};color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 32px;border-radius:12px;">
            ${cta.label}
          </a>
        </td>
      </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f6f5f1;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f5f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <div style="font-size:22px;font-weight:bold;color:#1a1a1a;">
                  <span style="display:inline-block;background-color:${GOLD};color:#ffffff;border-radius:10px;padding:6px 10px;margin-right:6px;">&#128337;</span>
                  OControle
                </div>
              </td>
            </tr>
            <tr>
              <td style="color:#1a1a1a;font-size:20px;font-weight:bold;padding-bottom:12px;">
                ${title}
              </td>
            </tr>
            <tr>
              <td style="color:#4b4b4b;font-size:14px;line-height:1.7;padding-bottom:8px;">
                ${greeting}
              </td>
            </tr>
            <tr>
              <td style="color:#4b4b4b;font-size:14px;line-height:1.7;padding-bottom:24px;">
                ${bodyHtml}
              </td>
            </tr>
            ${ctaBlock}
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="${SUPPORT_WHATSAPP_URL(whatsappText)}"
                   style="display:inline-block;background-color:${WHATSAPP_GREEN};color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 24px;border-radius:12px;">
                  &#128172; Besoin d'aide&nbsp;? Écrivez-nous sur WhatsApp
                </a>
              </td>
            </tr>
            <tr>
              <td style="color:#8a8a8a;font-size:12px;line-height:1.6;border-top:1px solid #eeeeee;padding-top:16px;">
                Notre équipe vous répond rapidement sur WhatsApp au
                ${SUPPORT_PHONE_DISPLAY} — accompagnement gratuit, pas à pas.
              </td>
            </tr>
          </table>
          <div style="color:#a0a0a0;font-size:11px;padding-top:16px;">
            OControle — Pointage et gestion de présence<br/>
            <a href="${WEB_LOGIN_URL}" style="color:#a0a0a0;">www.ocontrole.com</a>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

// ─── Envoi unique + journalisation ──────────────────────────

/**
 * Envoie un email UNE SEULE FOIS par `dedupeKey`, journalisé dans
 * `email_messages` (SENT / FAILED — un FAILED est retentable au prochain
 * appel avec la même clé). Ne lève jamais : les hooks appelants (signup,
 * webhook, cron) ne doivent jamais échouer à cause de l'email.
 */
export async function sendBillingEmailOnce(params: {
  email: string | null | undefined;
  subject: string;
  html: string;
  type: string;
  dedupeKey: string;
  companyId?: string | null;
  userId?: string | null;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const { email, subject, html, type, dedupeKey, companyId, userId } = params;

  try {
    const to = email?.trim().toLowerCase();
    if (!to || !to.includes("@")) return { sent: false, skipped: true };

    // Dédup : insertion d'abord ; si la clé existe déjà, le message a déjà
    // été envoyé (ou est en cours) → on sort, sauf si l'envoi avait échoué.
    try {
      await prisma.emailMessage.create({
        data: {
          companyId: companyId ?? null,
          userId: userId ?? null,
          email: to,
          type,
          dedupeKey,
          subject,
          status: "PENDING",
        },
      });
    } catch {
      const existing = await prisma.emailMessage.findUnique({
        where: { dedupeKey },
        select: { status: true },
      });
      if (existing?.status !== "FAILED") return { sent: false, skipped: true };
      await prisma.emailMessage.update({
        where: { dedupeKey },
        data: { status: "PENDING", error: null, email: to, subject },
      });
    }

    const ok = await sendEmail({ to, subject, html });

    await prisma.emailMessage.update({
      where: { dedupeKey },
      data: {
        status: ok ? "SENT" : "FAILED",
        error: ok ? null : "Resend a refusé l'envoi (voir logs serveur)",
      },
    });

    return { sent: ok, skipped: false };
  } catch (err) {
    console.error("[Email] sendBillingEmailOnce error:", err);
    return { sent: false, skipped: false };
  }
}

// ─── Helpers données ─────────────────────────────────────────

/** Email + prénom du propriétaire d'une entreprise. */
async function getOwnerContact(companyId: string): Promise<{
  email: string | null;
  name: string;
  userId: string | null;
}> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      memberships: {
        where: { isOwner: true, isActive: true },
        take: 1,
        select: { user: { select: { id: true, fullName: true, email: true } } },
      },
    },
  });

  const owner = company?.memberships[0]?.user;
  return {
    email: owner?.email ?? null,
    name: owner?.fullName?.split(/\s+/)[0] ?? "cher client",
    userId: owner?.id ?? null,
  };
}

// ─── 1. Email de bienvenue à l'inscription ───────────────────

export async function sendWelcomeEmail(params: {
  userId: string;
  fullName: string;
  email: string;
}): Promise<void> {
  const firstName = params.fullName.split(/\s+/)[0] || "et bienvenue";

  const html = renderBillingEmail({
    title: "Bienvenue sur OControle ! 🎉",
    greeting: `Bonjour ${firstName} 👋`,
    bodyHtml:
      `Merci de votre inscription. Voici ce qu'OControle va changer pour vous&nbsp;:` +
      `<ul style="margin:12px 0;padding-left:20px;">` +
      `<li style="margin-bottom:6px;">✅ Pointage de vos employés par <strong>GPS + photo</strong> — fini les pointages frauduleux</li>` +
      `<li style="margin-bottom:6px;">✅ Retards et absences détectés <strong>en temps réel</strong></li>` +
      `<li style="margin-bottom:6px;">✅ <strong>Calcul automatique des salaires</strong> selon les présences</li>` +
      `<li style="margin-bottom:6px;">✅ Gestion de plusieurs sites et équipes, depuis votre téléphone</li>` +
      `</ul>` +
      `📱 <strong>Sur Android&nbsp;?</strong> <a href="${APK_DOWNLOAD_URL}" style="color:${GOLD};font-weight:bold;">Téléchargez l'application ici</a>.<br/>` +
      `🍏 <strong>Sur iPhone&nbsp;?</strong> Pas besoin d'installer&nbsp;: tout fonctionne <a href="${WEB_LOGIN_URL}" style="color:${GOLD};font-weight:bold;">directement sur le web</a>.<br/><br/>` +
      `🎁 Votre <strong>essai gratuit de 3 jours</strong> est déjà actif.`,
    cta: { label: "Commencer maintenant", url: WEB_LOGIN_URL },
    whatsappText: "Bonjour, je viens de m'inscrire sur OControle et j'aimerais de l'aide pour démarrer.",
  });

  await sendBillingEmailOnce({
    email: params.email,
    subject: `${firstName}, bienvenue sur OControle — votre essai gratuit est actif 🎉`,
    html,
    type: "welcome",
    dedupeKey: `welcome:${params.userId}`,
    userId: params.userId,
  });
}

// ─── 2. Rappels d'essai (quotidiens, 3 derniers jours) ───────

export async function sendTrialReminderEmail(params: {
  companyId: string;
  subscriptionId: string;
  daysLeft: number;
}): Promise<{ sent: boolean }> {
  const { companyId, subscriptionId, daysLeft } = params;
  const contact = await getOwnerContact(companyId);
  if (!contact.email) return { sent: false };

  const when =
    daysLeft <= 0
      ? "se termine <strong>aujourd'hui</strong>"
      : daysLeft === 1
        ? "se termine <strong>demain</strong>"
        : `se termine dans <strong>${daysLeft} jours</strong>`;

  const subjectWhen =
    daysLeft <= 0 ? "aujourd'hui" : daysLeft === 1 ? "demain" : `dans ${daysLeft} jours`;

  const html = renderBillingEmail({
    title: "⏳ Votre essai gratuit touche à sa fin",
    greeting: `Bonjour ${contact.name},`,
    bodyHtml:
      `Votre essai gratuit OControle ${when}&nbsp;!<br/><br/>` +
      `Pour continuer à suivre les pointages de vos employés <strong>sans interruption</strong>, ` +
      `activez votre abonnement dès maintenant — cela prend 2 minutes.<br/><br/>` +
      `💳 Paiement sécurisé par <strong>Mobile Money</strong> (Orange, MTN, Moov, Wave).`,
    cta: { label: "Activer mon abonnement", url: WEB_BILLING_URL },
    whatsappText: "Bonjour, mon essai OControle se termine bientôt et j'ai une question sur les tarifs / le paiement.",
  });

  // Clé par jour → un email par jour maximum pendant la fenêtre de rappel.
  const dayKey = new Date().toISOString().slice(0, 10);
  const result = await sendBillingEmailOnce({
    email: contact.email,
    subject: `${contact.name}, votre essai OControle se termine ${subjectWhen} ⏳`,
    html,
    type: "trial_reminder",
    dedupeKey: `trial:${subscriptionId}:${dayKey}`,
    companyId,
    userId: contact.userId,
  });
  return { sent: result.sent };
}

/** Fin d'essai (jour J) — email distinct du rappel quotidien. */
export async function sendTrialEndedEmail(params: {
  companyId: string;
  subscriptionId: string;
  periodKey: string;
}): Promise<{ sent: boolean }> {
  const { companyId, subscriptionId, periodKey } = params;
  const contact = await getOwnerContact(companyId);
  if (!contact.email) return { sent: false };

  const html = renderBillingEmail({
    title: "🔔 Votre essai gratuit est terminé",
    greeting: `Bonjour ${contact.name},`,
    bodyHtml:
      `Votre essai gratuit OControle est <strong>terminé</strong>.<br/><br/>` +
      `Bonne nouvelle&nbsp;: vos données (employés, sites, pointages) sont ` +
      `<strong>conservées en sécurité</strong> — il ne manque que votre abonnement ` +
      `pour reprendre exactement où vous en étiez.<br/><br/>` +
      `💳 Paiement par <strong>Mobile Money</strong> (Orange, MTN, Moov, Wave) en 2 minutes.`,
    cta: { label: "Réactiver mon compte", url: WEB_BILLING_URL },
    whatsappText: "Bonjour, mon essai OControle est terminé et j'aimerais de l'aide pour activer mon abonnement.",
  });

  const result = await sendBillingEmailOnce({
    email: contact.email,
    subject: `${contact.name}, votre essai OControle est terminé — vos données vous attendent 🔔`,
    html,
    type: "trial_ended",
    dedupeKey: `trial_end:${subscriptionId}:${periodKey}`,
    companyId,
    userId: contact.userId,
  });
  return { sent: result.sent };
}

// ─── 3. Suivi des paiements ──────────────────────────────────

export async function sendPaymentSuccessEmail(params: {
  companyId: string;
  saleId: string;
  amount?: number;
  currency?: string;
}): Promise<void> {
  const { companyId, saleId, amount, currency } = params;
  const contact = await getOwnerContact(companyId);
  if (!contact.email) return;

  const amountLine =
    amount && amount > 0
      ? `Montant reçu&nbsp;: <strong>${amount.toLocaleString("fr-FR")} ${currency ?? "XOF"}</strong>.<br/><br/>`
      : "";

  const html = renderBillingEmail({
    title: "✅ Paiement confirmé — merci !",
    greeting: `Merci ${contact.name} ! 🎉`,
    bodyHtml:
      `Votre paiement OControle est <strong>confirmé</strong>.<br/><br/>` +
      amountLine +
      `Votre abonnement est maintenant <strong>actif</strong>&nbsp;: pointages, suivi des ` +
      `présences et calcul des salaires — tout est opérationnel.<br/><br/>` +
      `Bonne gestion, et merci de votre confiance&nbsp;! 🙏`,
    cta: { label: "Ouvrir mon espace", url: WEB_LOGIN_URL },
    whatsappText: "Bonjour, je viens de payer mon abonnement OControle et j'ai une question.",
  });

  await sendBillingEmailOnce({
    email: contact.email,
    subject: `Paiement confirmé ✅ — votre abonnement OControle est actif`,
    html,
    type: "payment_success",
    dedupeKey: `pay_success:${saleId || `${companyId}:${new Date().toISOString().slice(0, 10)}`}`,
    companyId,
    userId: contact.userId,
  });
}

export async function sendPaymentFailedEmail(params: {
  companyId: string;
  saleId?: string;
}): Promise<void> {
  const { companyId, saleId } = params;
  const contact = await getOwnerContact(companyId);
  if (!contact.email) return;

  const html = renderBillingEmail({
    title: "❌ Votre paiement n'a pas abouti",
    greeting: `Bonjour ${contact.name},`,
    bodyHtml:
      `Votre paiement OControle n'a malheureusement <strong>pas abouti</strong>. ` +
      `Les causes les plus fréquentes&nbsp;:` +
      `<ol style="margin:12px 0;padding-left:20px;">` +
      `<li style="margin-bottom:6px;">Solde Mobile Money <strong>insuffisant</strong> au moment du débit</li>` +
      `<li style="margin-bottom:6px;">Code de confirmation (PIN) <strong>non validé à temps</strong> sur votre téléphone</li>` +
      `<li style="margin-bottom:6px;">Réseau instable pendant la transaction</li>` +
      `</ol>` +
      `🔄 Vous pouvez réessayer tout de suite — votre compte et vos données restent intacts.<br/><br/>` +
      `🤝 <strong>Pas sûr du processus&nbsp;?</strong> Écrivez-nous sur WhatsApp&nbsp;: notre équipe ` +
      `vous guide <strong>pas à pas</strong>, gratuitement (ou vous appelle si vous préférez).`,
    cta: { label: "Réessayer mon paiement", url: WEB_BILLING_URL },
    whatsappText: "Bonjour, mon paiement OControle a échoué et j'aimerais de l'aide pour finaliser.",
  });

  await sendBillingEmailOnce({
    email: contact.email,
    subject: `${contact.name}, votre paiement OControle n'a pas abouti — on vous aide 🤝`,
    html,
    type: "payment_failed",
    dedupeKey: `pay_failed:${saleId || `${companyId}:${new Date().toISOString().slice(0, 13)}`}`,
    companyId,
    userId: contact.userId,
  });
}

export async function sendCheckoutAbandonedEmail(params: {
  companyId: string;
  saleId?: string;
}): Promise<void> {
  const { companyId, saleId } = params;
  const contact = await getOwnerContact(companyId);
  if (!contact.email) return;

  const html = renderBillingEmail({
    title: "🛒 Votre activation est presque terminée",
    greeting: `Bonjour ${contact.name},`,
    bodyHtml:
      `Nous avons remarqué que vous avez commencé l'activation de votre abonnement ` +
      `OControle sans aller au bout.<br/><br/>` +
      `Pas d'inquiétude, c'est très rapide à finaliser — 2 minutes suffisent.<br/><br/>` +
      `💳 Paiement par <strong>Mobile Money</strong> (Orange, MTN, Moov, Wave).<br/><br/>` +
      `Si quelque chose vous a bloqué (prix, moyen de paiement, question technique), ` +
      `écrivez-nous sur WhatsApp — on vous aide à finaliser immédiatement.`,
    cta: { label: "Finaliser mon abonnement", url: WEB_BILLING_URL },
    whatsappText: "Bonjour, j'ai commencé à activer mon abonnement OControle mais quelque chose m'a bloqué.",
  });

  await sendBillingEmailOnce({
    email: contact.email,
    subject: `${contact.name}, finalisez votre abonnement OControle en 2 minutes 🛒`,
    html,
    type: "checkout_abandoned",
    dedupeKey: `pay_abandoned:${saleId || `${companyId}:${new Date().toISOString().slice(0, 10)}`}`,
    companyId,
    userId: contact.userId,
  });
}
