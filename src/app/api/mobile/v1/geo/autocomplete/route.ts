/**
 * GET /api/mobile/v1/geo/autocomplete?q=<text>
 *
 * Proxy sécurisé vers Google Places Autocomplete.
 * La clé reste côté serveur — l'app Flutter ne la voit jamais.
 */

import { NextRequest } from "next/server";

import { errors, ok } from "../../_lib/api-response";
import { requireAnyAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import {
  isGoogleConfigured,
  placesAutocomplete,
} from "../../_lib/google-geo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAnyAuth();
  if (!auth.ok) return auth.response;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return errors.badRequest("Paramètre 'q' requis (min. 2 caractères)");
  }
  if (q.length > 200) {
    return errors.badRequest("Paramètre 'q' trop long (max 200)");
  }

  if (!isGoogleConfigured()) {
    return errors.serviceUnavailable("Google Maps non configuré");
  }

  try {
    const predictions = await placesAutocomplete(q);
    return ok({ predictions });
  } catch {
    return errors.upstreamError("Échec de l'appel Google Places");
  }
}

export const OPTIONS = preflight;
