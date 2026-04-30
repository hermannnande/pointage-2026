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

import { prisma } from "@/lib/prisma/client";
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
  let emailVerified = false;
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
    const user = (await resp.json()) as {
      id?: string;
      email?: string;
      email_confirmed_at?: string | null;
      app_metadata?: { provider?: string; providers?: string[] };
    };
    if (!user?.id) {
      return errors.unauthorized("Utilisateur introuvable");
    }
    supabaseUid = user.id;
    email = user.email ?? null;
    // Email considéré vérifié si email_confirmed_at est présent OU si le
    // provider est Google/Apple (qui vérifient l'email à la source).
    const provider = user.app_metadata?.provider ?? "";
    emailVerified = !!user.email_confirmed_at ||
      provider === "google" ||
      provider === "apple";
  } catch {
    return errors.upstreamError("Échec vérification Supabase");
  }

  let tenant = await getTenantContext(supabaseUid);

  // ─── Auto-linking par email ────────────────────────────────
  // Si Supabase ne reconnait pas ce supabaseUid (cas typique : un user qui
  // s'est inscrit côté web avec email/password puis se connecte via Google
  // sur l'APK → Supabase crée un NOUVEL utilisateur OAuth avec un autre uid),
  // on cherche un User Prisma avec le même email + membership actif. Si
  // trouvé ET que l'email Supabase est vérifié (Google/Apple ou confirmation
  // par lien email), on lie automatiquement les comptes en mettant à jour
  // `User.supabaseUid`. C'est SAFE car le seul moyen d'arriver ici avec un
  // email vérifié est d'avoir prouvé la possession de cet email côté Supabase.
  if (!tenant && email && emailVerified) {
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        supabaseUid: { not: supabaseUid },
        memberships: { some: { isActive: true } },
      },
      select: { id: true, supabaseUid: true },
    });
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { supabaseUid },
      });
      tenant = await getTenantContext(supabaseUid);
    }
  }

  if (!tenant) {
    // Pas de tenant et pas de fusion possible → flow d'onboarding.
    // L'app mobile ouvre le wizard natif, qui appellera ensuite
    // `/api/mobile/v1/owner/onboarding/company` pour créer la Company.
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
