/**
 * GET /api/mobile/v1/geo/reverse?lat=<n>&lng=<n>
 *
 * Proxy sécurisé vers Google Reverse Geocoding.
 * Utilisé pour obtenir l'adresse formatée d'un point GPS.
 */

import { NextRequest } from "next/server";

import { errors, ok } from "../../_lib/api-response";
import { requireAnyAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import { isGoogleConfigured, reverseGeocode } from "../../_lib/google-geo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireAnyAuth();
  if (!auth.ok) return auth.response;

  const latRaw = request.nextUrl.searchParams.get("lat");
  const lngRaw = request.nextUrl.searchParams.get("lng");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return errors.badRequest("Paramètre 'lat' invalide");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return errors.badRequest("Paramètre 'lng' invalide");
  }

  if (!isGoogleConfigured()) {
    return errors.serviceUnavailable("Google Maps non configuré");
  }

  try {
    const address = await reverseGeocode(lat, lng);
    return ok({ address, lat, lng });
  } catch {
    return errors.upstreamError("Échec de l'appel Google Reverse Geocoding");
  }
}

export const OPTIONS = preflight;
