/**
 * GET /api/mobile/v1/auth/owner/me
 *
 * Vérifie le token Supabase + renvoie le tenant context complet
 * (entreprise, rôle, permissions).
 */

import { ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  return ok({
    supabaseUid: auth.supabaseUid,
    tenant: auth.tenant,
  });
}

export const OPTIONS = preflight;
