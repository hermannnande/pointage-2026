/**
 * POST /api/mobile/v1/auth/owner/logout
 *
 * Pour Supabase, le logout réel est géré côté client (supabase_flutter)
 * qui révoque le refresh_token. Côté API on retourne juste un ack.
 */

import { ok } from "../../../_lib/api-response";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return ok({ loggedOut: true });
}

export const OPTIONS = preflight;
