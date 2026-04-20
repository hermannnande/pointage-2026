/**
 * Authentification de l'API Mobile.
 *
 * Deux flavors :
 *   - EMPLOYEE : le client envoie `Authorization: Bearer <token-HMAC>`
 *                où le token est créé par `lib/employee-auth.ts/createSessionToken()`
 *
 *   - OWNER    : le client envoie `Authorization: Bearer <access-token-Supabase>`
 *                qu'on valide via `supabase.auth.getUser(token)`.
 *                On résout ensuite le `TenantContext` via `tenant.service.ts`.
 *
 * Aucune route mobile ne doit lire les cookies — on est en mode token bearer.
 */

import { headers } from "next/headers";

import { verifySessionToken, type EmployeeSessionPayload } from "@/lib/employee-auth";
import { getTenantContext } from "@/services/tenant.service";
import type { TenantContext } from "@/types";

import { errors } from "./api-response";

// ─── Extraction du token ─────────────────────────────────────────────

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function getAuthHeader(): Promise<string | null> {
  const h = await headers();
  return h.get("authorization");
}

// ─── EMPLOYEE auth ───────────────────────────────────────────────────

export type EmployeeAuth =
  | { ok: true; session: EmployeeSessionPayload; token: string }
  | { ok: false; response: Response };

export async function requireEmployeeAuth(): Promise<EmployeeAuth> {
  const token = extractBearerToken(await getAuthHeader());
  if (!token) {
    return { ok: false, response: errors.unauthorized("Token manquant") };
  }

  const session = verifySessionToken(token);
  if (!session) {
    return { ok: false, response: errors.unauthorized("Token invalide ou expiré") };
  }

  return { ok: true, session, token };
}

// ─── OWNER / Admin auth (Supabase) ───────────────────────────────────

export type OwnerAuth =
  | { ok: true; supabaseUid: string; tenant: TenantContext; token: string }
  | { ok: false; response: Response };

export async function requireOwnerAuth(): Promise<OwnerAuth> {
  const token = extractBearerToken(await getAuthHeader());
  if (!token) {
    return { ok: false, response: errors.unauthorized("Token manquant") };
  }

  // On vérifie le token avec Supabase (service role) sans toucher aux cookies.
  // C'est simple, sûr et sans état.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { ok: false, response: errors.serverError("Supabase non configuré") };
  }

  let supabaseUid: string;
  try {
    const resp = await fetch(`${url}/auth/v1/user`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!resp.ok) {
      return { ok: false, response: errors.unauthorized("Token Supabase invalide") };
    }
    const user = (await resp.json()) as { id?: string };
    if (!user?.id) {
      return { ok: false, response: errors.unauthorized("Utilisateur introuvable") };
    }
    supabaseUid = user.id;
  } catch {
    return { ok: false, response: errors.upstreamError("Échec vérification Supabase") };
  }

  const tenant = await getTenantContext(supabaseUid);
  if (!tenant) {
    return {
      ok: false,
      response: errors.forbidden("Aucune entreprise associée à ce compte"),
    };
  }

  return { ok: true, supabaseUid, tenant, token };
}

// ─── DUAL auth (l'une OU l'autre) ────────────────────────────────────

export type DualAuth =
  | { ok: true; flavor: "employee"; session: EmployeeSessionPayload }
  | { ok: true; flavor: "owner"; tenant: TenantContext; supabaseUid: string }
  | { ok: false; response: Response };

/**
 * Tente d'abord la session employé (HMAC), puis la session owner (Supabase).
 * Utile pour les endpoints partagés (ex: /geo/* peut être appelé par les deux).
 */
export async function requireAnyAuth(): Promise<DualAuth> {
  const token = extractBearerToken(await getAuthHeader());
  if (!token) {
    return { ok: false, response: errors.unauthorized("Token manquant") };
  }

  // 1) Tenter HMAC employé (rapide, local)
  const empSession = verifySessionToken(token);
  if (empSession) {
    return { ok: true, flavor: "employee", session: empSession };
  }

  // 2) Sinon, tenter Supabase (réseau)
  const owner = await requireOwnerAuth();
  if (owner.ok) {
    return {
      ok: true,
      flavor: "owner",
      tenant: owner.tenant,
      supabaseUid: owner.supabaseUid,
    };
  }

  return { ok: false, response: errors.unauthorized("Token non reconnu") };
}
