import { prisma } from "@/lib/prisma/client";
import { DEFAULT_COUNTRY } from "@/lib/constants";
import {
  getCountryFromPhone,
  getLocalPhoneNumber,
  getPhonePrefixForCountry,
  repairLocalNumberForCountry,
} from "@/lib/phone-country";

// ============================================================
// WHATSAPP — WasenderAPI (https://wasenderapi.com)
// ============================================================
// Messages automatiques envoyés depuis le numéro OControle :
//   1. Bienvenue à l'inscription (bienfaits + liens de téléchargement)
//   2. Rappel quotidien pendant les 3 jours d'essai (lien facturation)
//   3. Suivi des paiements : confirmé / échoué / abandonné
//
// Chaque envoi est journalisé dans `whatsapp_messages` avec une
// `dedupeKey` unique → jamais deux fois le même message (crons et
// webhooks peuvent rejouer sans risque de spam).

const WASENDER_API_URL =
  process.env.WASENDER_API_URL || "https://www.wasenderapi.com/api";

const WEB_BILLING_URL = "https://www.ocontrole.com/dashboard/billing";
const WEB_LOGIN_URL = "https://www.ocontrole.com/login";
const APK_DOWNLOAD_URL = "https://www.ocontrole.com/download/apk";
const SUPPORT_PHONE_DISPLAY = "+225 07 78 03 00 75";

// ─── Normalisation téléphone → E.164 ────────────────────────

/**
 * Convertit un numéro saisi librement ("07 78 03 00 75", "+2250778030075",
 * "00225…") en E.164 ("+2250778030075"). Les numéros locaux sans indicatif
 * sont supposés du pays `fallbackCountry` (CI par défaut), avec réparation
 * du 0 initial perdu (CI/BJ/GA). Renvoie null si inutilisable.
 */
export function toE164(
  phone: string | null | undefined,
  fallbackCountry: string = DEFAULT_COUNTRY,
): string | null {
  if (!phone) return null;
  const raw = phone.trim();
  if (!raw) return null;

  const country = getCountryFromPhone(raw) ?? fallbackCountry;
  const prefix = getPhonePrefixForCountry(country);
  if (!prefix) return null;

  const local = repairLocalNumberForCountry(getLocalPhoneNumber(raw), country);
  const digits = local.replace(/\D/g, "");
  if (digits.length < 6) return null;

  return `+${prefix}${digits}`;
}

// ─── Client WasenderAPI ──────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Statut de la session WhatsApp WasenderAPI ("connected", "logged_out"…).
 * Renvoie null si le statut n'a pas pu être déterminé (erreur réseau…).
 */
export async function getWasenderSessionStatus(): Promise<string | null> {
  const apiKey = process.env.WASENDER_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(`${WASENDER_API_URL}/status`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    const parsed = (await res.json()) as { status?: string };
    return parsed.status ?? null;
  } catch {
    return null;
  }
}

async function callWasender(to: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.WASENDER_API_KEY;
  if (!apiKey) {
    console.warn("[WhatsApp] WASENDER_API_KEY non configurée — envoi ignoré");
    return { ok: false, error: "WASENDER_API_KEY manquante" };
  }

  // WasenderAPI (protection de compte) : 1 message max toutes les 5 s →
  // en cas de 429 on attend `retry_after` (ou 6 s) et on réessaie.
  const maxAttempts = 3;
  let lastError = "unknown";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${WASENDER_API_URL}/send-message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, text }),
      });

      const body = await res.text();

      if (res.ok) {
        // ⚠️ WasenderAPI peut répondre HTTP 200 avec success:false (ex.
        // session WhatsApp déconnectée). Un 200 seul ne prouve PAS l'envoi.
        try {
          const parsed = JSON.parse(body) as { success?: boolean; message?: string };
          if (parsed.success === false) {
            const msg = parsed.message ?? "success:false";
            console.error(`[WhatsApp] Refus API pour ${to}: ${msg}`);
            return { ok: false, error: `API: ${msg.slice(0, 300)}` };
          }
        } catch {
          // Corps non-JSON inattendu → on considère l'envoi accepté.
        }
        return { ok: true };
      }

      lastError = `HTTP ${res.status}: ${body.slice(0, 300)}`;

      if (res.status === 429 && attempt < maxAttempts) {
        let waitSec = 6;
        try {
          const parsed = JSON.parse(body) as { retry_after?: number };
          if (parsed.retry_after && parsed.retry_after > 0) waitSec = parsed.retry_after + 1;
        } catch {
          // garde le défaut
        }
        await sleep(waitSec * 1000);
        continue;
      }

      console.error(`[WhatsApp] Échec envoi vers ${to}: ${lastError}`);
      return { ok: false, error: lastError };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "unknown";
      if (attempt < maxAttempts) {
        await sleep(3000);
        continue;
      }
    }
  }

  console.error(`[WhatsApp] Erreur envoi vers ${to} après ${maxAttempts} tentatives:`, lastError);
  return { ok: false, error: lastError };
}

/**
 * Envoie un message WhatsApp UNE SEULE FOIS par `dedupeKey`.
 * Journalise le résultat (SENT / FAILED) dans whatsapp_messages.
 * Ne lève jamais — les hooks appelants (signup, webhook, cron) ne doivent
 * jamais échouer à cause de WhatsApp.
 */
export async function sendWhatsAppOnce(params: {
  phone: string | null | undefined;
  text: string;
  type: string;
  dedupeKey: string;
  companyId?: string | null;
  userId?: string | null;
  fallbackCountry?: string;
}): Promise<{ sent: boolean; skipped: boolean }> {
  const { phone, text, type, dedupeKey, companyId, userId, fallbackCountry } = params;

  try {
    const to = toE164(phone, fallbackCountry);
    if (!to) return { sent: false, skipped: true };

    // Dédup : on tente l'insertion d'abord ; si la clé existe déjà,
    // le message a déjà été envoyé (ou est en cours) → on sort.
    // Exception : un envoi précédent en échec (FAILED) peut être retenté.
    try {
      await prisma.whatsAppMessage.create({
        data: {
          companyId: companyId ?? null,
          userId: userId ?? null,
          phone: to,
          type,
          dedupeKey,
          content: text,
          status: "PENDING",
        },
      });
    } catch {
      // Violation d'unicité sur dedupeKey → déjà traité, sauf si FAILED.
      const existing = await prisma.whatsAppMessage.findUnique({
        where: { dedupeKey },
        select: { status: true },
      });
      if (existing?.status !== "FAILED") return { sent: false, skipped: true };
      await prisma.whatsAppMessage.update({
        where: { dedupeKey },
        data: { status: "PENDING", error: null, phone: to, content: text },
      });
    }

    const result = await callWasender(to, text);

    await prisma.whatsAppMessage.update({
      where: { dedupeKey },
      data: {
        status: result.ok ? "SENT" : "FAILED",
        error: result.error ?? null,
      },
    });

    return { sent: result.ok, skipped: false };
  } catch (err) {
    console.error("[WhatsApp] sendWhatsAppOnce error:", err);
    return { sent: false, skipped: false };
  }
}

// ─── Helpers données ─────────────────────────────────────────

/** Téléphone + prénom du propriétaire d'une entreprise (fallback : company). */
async function getOwnerContact(companyId: string): Promise<{
  phone: string | null;
  name: string;
  userId: string | null;
  country: string;
}> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      phone: true,
      country: true,
      memberships: {
        where: { isOwner: true, isActive: true },
        take: 1,
        select: { user: { select: { id: true, fullName: true, phone: true } } },
      },
    },
  });

  const owner = company?.memberships[0]?.user;
  return {
    phone: owner?.phone || company?.phone || null,
    name: owner?.fullName?.split(/\s+/)[0] ?? "cher client",
    userId: owner?.id ?? null,
    country: company?.country ?? DEFAULT_COUNTRY,
  };
}

/** L'entreprise a-t-elle déjà utilisé l'app mobile (APK) ? */
async function hasMobileApp(companyId: string): Promise<boolean> {
  const log = await prisma.appConnectionLog.findFirst({
    where: { companyId },
    select: { id: true },
  });
  return log != null;
}

/** Bloc "où payer" adapté : app installée → instructions app ; sinon web. */
function billingBlock(appInstalled: boolean): string {
  if (appInstalled) {
    return (
      `📱 Ouvrez votre application *OControle* → menu *Abonnement* pour payer en 2 minutes.\n` +
      `Ou directement sur le web :\n👉 ${WEB_BILLING_URL}`
    );
  }
  return `💻 Rendez-vous dans votre espace de facturation :\n👉 ${WEB_BILLING_URL}`;
}

// ─── 1. Message de bienvenue à l'inscription ─────────────────

export async function sendWelcomeWhatsApp(params: {
  userId: string;
  fullName: string;
  phone: string | null | undefined;
}): Promise<void> {
  const firstName = params.fullName.split(/\s+/)[0] || "et bienvenue";

  const text =
    `Bonjour ${firstName} 👋 et bienvenue sur *OControle* ! 🎉\n\n` +
    `Merci de votre inscription. Voici ce qu'OControle va changer pour vous :\n` +
    `✅ Pointage de vos employés par *GPS + photo* — fini les pointages frauduleux\n` +
    `✅ Retards et absences détectés *en temps réel*\n` +
    `✅ *Calcul automatique des salaires* selon les présences\n` +
    `✅ Gestion de plusieurs sites et équipes, depuis votre téléphone\n\n` +
    `📱 *Vous êtes sur Android ?* Téléchargez l'application ici :\n` +
    `${APK_DOWNLOAD_URL}\n\n` +
    `🍏 *Vous êtes sur iPhone ?* Pas besoin d'installer : tout fonctionne directement sur le web :\n` +
    `${WEB_LOGIN_URL}\n\n` +
    `🎁 Votre *essai gratuit de 3 jours* est déjà actif.\n\n` +
    `Besoin d'aide pour démarrer ? Répondez simplement à ce message, notre équipe vous accompagne gratuitement. 🤝`;

  await sendWhatsAppOnce({
    phone: params.phone,
    text,
    type: "welcome",
    dedupeKey: `welcome:${params.userId}`,
    userId: params.userId,
  });
}

// ─── 2. Rappels d'essai (quotidiens, 3 derniers jours) ───────

export async function sendTrialReminderWhatsApp(params: {
  companyId: string;
  subscriptionId: string;
  daysLeft: number;
}): Promise<{ sent: boolean }> {
  const { companyId, subscriptionId, daysLeft } = params;
  const [contact, appInstalled] = await Promise.all([
    getOwnerContact(companyId),
    hasMobileApp(companyId),
  ]);
  if (!contact.phone) return { sent: false };

  const when =
    daysLeft <= 0
      ? "se termine *aujourd'hui*"
      : daysLeft === 1
        ? "se termine *demain*"
        : `se termine dans *${daysLeft} jours*`;

  const text =
    `⏳ Bonjour ${contact.name}, votre essai gratuit *OControle* ${when} !\n\n` +
    `Pour continuer à suivre les pointages de vos employés *sans interruption*, activez votre abonnement dès maintenant — cela prend 2 minutes :\n\n` +
    `${billingBlock(appInstalled)}\n\n` +
    `💳 Paiement sécurisé par Mobile Money (Orange, MTN, Moov, Wave).\n\n` +
    `Une question sur les tarifs ou besoin d'aide pour payer ? Répondez à ce message, nous sommes là. 🤝`;

  // Clé par jour → un message par jour maximum pendant la fenêtre de rappel.
  const dayKey = new Date().toISOString().slice(0, 10);
  const result = await sendWhatsAppOnce({
    phone: contact.phone,
    text,
    type: "trial_reminder",
    dedupeKey: `trial:${subscriptionId}:${dayKey}`,
    companyId,
    userId: contact.userId,
    fallbackCountry: contact.country,
  });
  return { sent: result.sent };
}

/** Fin d'essai (jour J) — message distinct du rappel quotidien. */
export async function sendTrialEndedWhatsApp(params: {
  companyId: string;
  subscriptionId: string;
  periodKey: string;
}): Promise<{ sent: boolean }> {
  const { companyId, subscriptionId, periodKey } = params;
  const [contact, appInstalled] = await Promise.all([
    getOwnerContact(companyId),
    hasMobileApp(companyId),
  ]);
  if (!contact.phone) return { sent: false };

  const text =
    `🔔 Bonjour ${contact.name}, votre essai gratuit *OControle* est *terminé*.\n\n` +
    `Vos données (employés, sites, pointages) sont *conservées en sécurité* — il ne manque que votre abonnement pour reprendre exactement où vous en étiez :\n\n` +
    `${billingBlock(appInstalled)}\n\n` +
    `💳 Paiement par Mobile Money (Orange, MTN, Moov, Wave) en 2 minutes.\n\n` +
    `Un souci pour payer ou une question ? Répondez à ce message et nous vous aidons immédiatement. 🤝`;

  const result = await sendWhatsAppOnce({
    phone: contact.phone,
    text,
    type: "trial_ended",
    dedupeKey: `trial_end:${subscriptionId}:${periodKey}`,
    companyId,
    userId: contact.userId,
    fallbackCountry: contact.country,
  });
  return { sent: result.sent };
}

// ─── 3. Suivi des paiements ──────────────────────────────────

export async function sendPaymentSuccessWhatsApp(params: {
  companyId: string;
  saleId: string;
  amount?: number;
  currency?: string;
}): Promise<void> {
  const { companyId, saleId, amount, currency } = params;
  const contact = await getOwnerContact(companyId);
  if (!contact.phone) return;

  const amountLine =
    amount && amount > 0
      ? `Montant reçu : *${amount.toLocaleString("fr-FR")} ${currency ?? "XOF"}*\n\n`
      : "";

  const text =
    `✅ Merci ${contact.name} ! Votre paiement *OControle* est *confirmé*. 🎉\n\n` +
    amountLine +
    `Votre abonnement est maintenant *actif* : pointages, suivi des présences et calcul des salaires — tout est opérationnel.\n\n` +
    `Bonne gestion, et merci de votre confiance ! 🙏\n` +
    `L'équipe OControle — ${SUPPORT_PHONE_DISPLAY}`;

  await sendWhatsAppOnce({
    phone: contact.phone,
    text,
    type: "payment_success",
    dedupeKey: `pay_success:${saleId || `${companyId}:${new Date().toISOString().slice(0, 10)}`}`,
    companyId,
    userId: contact.userId,
    fallbackCountry: contact.country,
  });
}

export async function sendPaymentFailedWhatsApp(params: {
  companyId: string;
  saleId?: string;
}): Promise<void> {
  const { companyId, saleId } = params;
  const [contact, appInstalled] = await Promise.all([
    getOwnerContact(companyId),
    hasMobileApp(companyId),
  ]);
  if (!contact.phone) return;

  const text =
    `❌ Bonjour ${contact.name}, votre paiement *OControle* n'a malheureusement *pas abouti*.\n\n` +
    `Les causes les plus fréquentes :\n` +
    `1️⃣ Solde Mobile Money *insuffisant* au moment du débit\n` +
    `2️⃣ Code de confirmation (PIN) *non validé à temps* sur votre téléphone\n` +
    `3️⃣ Réseau instable pendant la transaction\n\n` +
    `🔄 Vous pouvez réessayer tout de suite :\n${billingBlock(appInstalled)}\n\n` +
    `🤝 *Vous n'êtes pas sûr du processus ?* Répondez simplement à ce message : notre équipe vous guide *pas à pas* (ou vous appelle si vous préférez). Votre compte et vos données restent intacts.`;

  await sendWhatsAppOnce({
    phone: contact.phone,
    text,
    type: "payment_failed",
    dedupeKey: `pay_failed:${saleId || `${companyId}:${new Date().toISOString().slice(0, 13)}`}`,
    companyId,
    userId: contact.userId,
    fallbackCountry: contact.country,
  });
}

export async function sendCheckoutAbandonedWhatsApp(params: {
  companyId: string;
  saleId?: string;
}): Promise<void> {
  const { companyId, saleId } = params;
  const [contact, appInstalled] = await Promise.all([
    getOwnerContact(companyId),
    hasMobileApp(companyId),
  ]);
  if (!contact.phone) return;

  const text =
    `🛒 Bonjour ${contact.name}, nous avons remarqué que vous avez commencé l'activation de votre abonnement *OControle* sans aller au bout.\n\n` +
    `Pas d'inquiétude, c'est très rapide à finaliser :\n${billingBlock(appInstalled)}\n\n` +
    `💳 Paiement par Mobile Money (Orange, MTN, Moov, Wave).\n\n` +
    `Si quelque chose vous a bloqué (prix, moyen de paiement, question technique), répondez à ce message — on vous aide à finaliser en 2 minutes. 🤝`;

  await sendWhatsAppOnce({
    phone: contact.phone,
    text,
    type: "checkout_abandoned",
    dedupeKey: `pay_abandoned:${saleId || `${companyId}:${new Date().toISOString().slice(0, 10)}`}`,
    companyId,
    userId: contact.userId,
    fallbackCountry: contact.country,
  });
}
