/**
 * Réinitialisation de mot de passe propriétaire (web + app mobile).
 *
 * Pourquoi pas `supabase.auth.resetPasswordForEmail` ? Il envoie l'email
 * via le service email de Supabase, qui n'est pas configuré sur ce projet
 * (aucun SMTP custom) — les emails n'arrivaient jamais. À la place :
 *   1. `auth.admin.generateLink({ type: "recovery" })` (service role)
 *      → fournit un `hashed_token` sans envoyer d'email ;
 *   2. on construit un lien vers NOTRE page `/reset-password?token_hash=…`
 *      (aucune dépendance à l'allowlist redirect de Supabase, et le lien
 *      fonctionne depuis n'importe quel appareil — y compris quand
 *      l'utilisateur lit ses emails sur un autre téléphone) ;
 *   3. on envoie l'email nous-mêmes via Resend (`sendEmail`).
 *
 * La page /reset-password appelle ensuite `verifyOtp({ type: "recovery",
 * token_hash })` puis `updateUser({ password })`.
 *
 * Anti-énumération : ne JAMAIS révéler à l'appelant si l'email existe.
 * Toutes les erreurs sont loguées puis avalées.
 */

import { getPublicAppUrl } from "@/services/chariow.service";
import { sendEmail } from "@/lib/email/send-email";
import { createServiceClient } from "@/lib/supabase/server";

export async function sendPasswordResetEmail(
  email: string,
  opts: { fromApp?: boolean } = {},
): Promise<void> {
  try {
    const supabase = await createServiceClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (error || !data?.properties?.hashed_token) {
      // Utilisateur inconnu, compte Google sans mot de passe, etc.
      console.warn(
        `password-reset: generateLink KO pour ${email}: ${error?.message ?? "hashed_token absent"}`,
      );
      return;
    }

    // Le lien de l'email est TOUJOURS une URL https (fiable dans tous les
    // clients mail — un lien `app.ocontrole://` n'est souvent pas cliquable
    // sous Gmail). Quand la demande vient de l'app, on ajoute `platform=app` :
    // la page web /reset-password propose alors un bouton « Ouvrir dans
    // l'application » qui déclenche le deep link `app.ocontrole://reset-password`
    // (le schéma custom fonctionne bien depuis une page web).
    const params = new URLSearchParams({
      token_hash: data.properties.hashed_token,
      type: "recovery",
    });
    if (opts.fromApp) params.set("platform", "app");
    const resetUrl = `${getPublicAppUrl()}/reset-password?${params.toString()}`;

    const sent = await sendEmail({
      to: email,
      subject: "Réinitialisez votre mot de passe OControle",
      html: buildResetEmailHtml(resetUrl),
    });
    if (!sent) {
      console.error(`password-reset: envoi Resend KO pour ${email}`);
    }
  } catch (e) {
    console.error("password-reset: erreur inattendue", e);
  }
}

function buildResetEmailHtml(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f6f5f1;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f5f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <div style="font-size:22px;font-weight:bold;color:#1a1a1a;">
                  <span style="display:inline-block;background-color:#D4A017;color:#ffffff;border-radius:10px;padding:6px 10px;margin-right:6px;">&#128337;</span>
                  OControle
                </div>
              </td>
            </tr>
            <tr>
              <td style="color:#1a1a1a;font-size:20px;font-weight:bold;padding-bottom:12px;">
                Réinitialisation de votre mot de passe
              </td>
            </tr>
            <tr>
              <td style="color:#4b4b4b;font-size:14px;line-height:1.6;padding-bottom:24px;">
                Vous avez demandé à réinitialiser le mot de passe de votre compte
                OControle. Cliquez sur le bouton ci-dessous pour choisir un
                nouveau mot de passe. Ce lien est valable pendant 1&nbsp;heure.
              </td>
            </tr>
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <a href="${resetUrl}"
                   style="display:inline-block;background-color:#D4A017;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold;padding:14px 28px;border-radius:12px;">
                  Choisir un nouveau mot de passe
                </a>
              </td>
            </tr>
            <tr>
              <td style="color:#8a8a8a;font-size:12px;line-height:1.6;padding-bottom:16px;">
                Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre
                navigateur&nbsp;:<br/>
                <a href="${resetUrl}" style="color:#D4A017;word-break:break-all;">${resetUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="color:#8a8a8a;font-size:12px;line-height:1.6;border-top:1px solid #eeeeee;padding-top:16px;">
                Vous n'êtes pas à l'origine de cette demande&nbsp;? Ignorez cet
                email — votre mot de passe actuel reste inchangé.
              </td>
            </tr>
          </table>
          <div style="color:#a0a0a0;font-size:11px;padding-top:16px;">
            OControle — Pointage et gestion de présence
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
