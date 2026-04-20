/**
 * POST /api/mobile/v1/auth/employee/logout
 *
 * En mode token (mobile), le logout côté serveur est essentiellement un
 * "ack" : c'est au client de supprimer le token de son SecureStorage.
 * Côté DB on ne stocke pas la liste des tokens valides (HMAC stateless).
 *
 * Si on veut révoquer plus tard, on ajoutera une table `revoked_tokens`.
 */

import { ok } from "../../../_lib/api-response";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  return ok({ loggedOut: true });
}

export const OPTIONS = preflight;
