/**
 * POST /api/mobile/v1/auth/owner/exchange
 *
 * Body : { accessToken: string, refreshToken?: string }
 *
 * Échange un access_token Supabase (obtenu côté Flutter via
 * supabase_flutter SDK) contre :
 *   - Une vérification serveur du token
 *   - Le TenantContext résolu (rôle, permissions, entreprise)
 *
 * Le client doit conserver l'access_token + refresh_token dans SecureStorage
 * et les passer dans `Authorization: Bearer <accessToken>` pour les
 * requêtes suivantes.
 */

import { z } from "zod";

import { getTenantContext } from "@/services/tenant.service";

import { errors, ok } from "../../../_lib/api-response";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const exchangeSchema = z.object({
  accessToken: z.string().min(10, "accessToken invalide"),
  refreshToken: z.string().optional(),
});

export async function POST(request: Request) {
  const parsed = await parseAndValidateBody(request, exchangeSchema);
  if (!parsed.ok) return parsed.response;

  const { accessToken } = parsed.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return errors.serverError("Supabase non configuré");
  }

  let supabaseUid: string;
  let email: string | null = null;
  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!resp.ok) {
      return errors.unauthorized("Token Supabase invalide");
    }
    const user = (await resp.json()) as { id?: string; email?: string };
    if (!user?.id) {
      return errors.unauthorized("Utilisateur introuvable");
    }
    supabaseUid = user.id;
    email = user.email ?? null;
  } catch {
    return errors.upstreamError("Échec vérification Supabase");
  }

  const tenant = await getTenantContext(supabaseUid);
  if (!tenant) {
    // Le user Supabase existe mais n'a pas encore de Company associée
    // (cas typique : signup mobile email + password OU sign-in Google d'un
    // tout nouvel utilisateur). On répond 200 avec un flag explicite plutôt
    // qu'un 403 — l'app mobile sait qu'elle doit ouvrir le navigateur sur
    // /onboarding pour que l'utilisateur termine la création de son
    // entreprise (le wizard web crée la Company + le membership owner).
    return ok({
      supabaseUid,
      email,
      tenant: null,
      needsOnboarding: true,
      onboardingUrl: "https://ocontrole.com/onboarding",
    });
  }

  return ok({
    supabaseUid,
    email,
    tenant,
    needsOnboarding: false,
  });
}

export const OPTIONS = preflight;
