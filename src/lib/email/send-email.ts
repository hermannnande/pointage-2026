/**
 * Envoi d'emails transactionnels via l'API Resend.
 *
 * Le service email intégré de Supabase n'est PAS configuré sur ce projet
 * (aucun email de confirmation à l'inscription) — tous les emails
 * transactionnels (réinitialisation de mot de passe…) passent donc par
 * Resend, avec `RESEND_API_KEY` + `EMAIL_FROM` définis dans .env.local.
 */

const RESEND_API_URL = "https://api.resend.com/emails";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envoie un email. Retourne `true` si Resend a accepté l'envoi.
 * Ne lève jamais — les erreurs sont loguées côté serveur (l'appelant
 * décide s'il doit les exposer ; pour le reset de mot de passe on reste
 * silencieux afin de ne pas révéler l'existence d'un compte).
 */
export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.error(
      "sendEmail: RESEND_API_KEY / EMAIL_FROM manquants — email non envoyé.",
    );
    return false;
  }

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`sendEmail: Resend ${res.status} — ${body}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error("sendEmail: échec réseau Resend", e);
    return false;
  }
}
