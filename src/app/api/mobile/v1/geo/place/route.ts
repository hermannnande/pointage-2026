/**
 * GET /api/mobile/v1/geo/place?placeId=<id>
 *
 * Proxy sécurisé vers Google Place Details.
 */

import { NextRequest } from "next/server";

import { errors, ok } from "../../_lib/api-response";
import { requireAnyAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import { isGoogleConfigured, placeDetails } from "../../_lib/google-geo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAnyAuth();
  if (!auth.ok) return auth.response;

  const placeId = request.nextUrl.searchParams.get("placeId")?.trim() ?? "";
  if (!placeId) {
    return errors.badRequest("Paramètre 'placeId' requis");
  }

  if (!isGoogleConfigured()) {
    return errors.serviceUnavailable("Google Maps non configuré");
  }

  try {
    const result = await placeDetails(placeId);
    if (!result) {
      return errors.notFound("Lieu introuvable");
    }
    return ok(result);
  } catch {
    return errors.upstreamError("Échec de l'appel Google Places Details");
  }
}

export const OPTIONS = preflight;
