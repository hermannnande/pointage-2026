/**
 * POST /api/mobile/v1/auth/owner/forgot-password
 *
 * Body : { email: string }
 * Réponse 200 : { sent: true } — TOUJOURS, que l'email existe ou non
 * (anti-énumération de comptes).
 *
 * Envoie l'email de réinitialisation via Resend avec un lien vers la page
 * web /reset-password?token_hash=… (cf. password-reset.service.ts). Le
 * lien fonctionne depuis n'importe quel appareil ; une fois le mot de
 * passe changé, l'utilisateur revient se connecter dans l'app.
 *
 * Endpoint PUBLIC (l'utilisateur n'est pas connecté).
 */

import { z } from "zod";

import { sendPasswordResetEmail } from "@/services/password-reset.service";

import { ok } from "../../../_lib/api-response";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const forgotSchema = z.object({
  email: z.string().trim().email("Adresse email invalide").max(200),
});

export async function POST(request: Request) {
  const parsed = await parseAndValidateBody(request, forgotSchema);
  if (!parsed.ok) return parsed.response;

  // fromApp : la page web /reset-password proposera « Ouvrir dans
  // l'application » pour finir la réinitialisation directement dans l'APK.
  await sendPasswordResetEmail(parsed.data.email, { fromApp: true });

  return ok({ sent: true });
}

export const OPTIONS = preflight;
