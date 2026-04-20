/**
 * GET /api/mobile/v1/tenant/context
 *
 * Renvoie le TenantContext complet (rôle, permissions, entreprise).
 * Réservé aux owners/admins (token Supabase requis).
 */

import { ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  return ok(auth.tenant);
}

export const OPTIONS = preflight;
