/**
 * Wrapper interne autour des APIs Google Maps Platform.
 *
 * Ce fichier est l'UNIQUE endroit où l'on appelle `maps.googleapis.com`
 * dans le périmètre mobile. Toutes les routes /geo/* l'utilisent.
 *
 * La clé GOOGLE_MAPS_API_KEY ne doit JAMAIS sortir de ce module
 * (le proxy garantit qu'elle reste côté serveur).
 */

const GOOGLE_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
  "";

const TIMEOUT_MS = 8000;

export interface GeoResult {
  lat: number;
  lng: number;
  display: string;
}

export interface GeoPrediction {
  placeId: string;
  display: string;
}

function ensureKey(): string {
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY non configuré");
  }
  return GOOGLE_API_KEY;
}

// ─── Places Autocomplete ──────────────────────────────────────────────

export async function placesAutocomplete(query: string): Promise<GeoPrediction[]> {
  const key = ensureKey();
  const url =
    `https://maps.googleapis.com/maps/api/place/autocomplete/json` +
    `?input=${encodeURIComponent(query)}` +
    `&key=${encodeURIComponent(key)}` +
    `&language=fr&types=geocode|establishment`;

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  if (data?.status !== "OK" || !Array.isArray(data.predictions)) return [];

  return data.predictions
    .slice(0, 8)
    .map((p: { place_id?: string; description?: string }) => ({
      placeId: String(p.place_id ?? ""),
      display: String(p.description ?? ""),
    }))
    .filter((p: GeoPrediction) => p.placeId && p.display);
}

// ─── Place Details ────────────────────────────────────────────────────

export async function placeDetails(placeId: string): Promise<GeoResult | null> {
  const key = ensureKey();
  const url =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}` +
    `&fields=geometry,formatted_address` +
    `&key=${encodeURIComponent(key)}` +
    `&language=fr`;

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data?.status !== "OK" || !data.result) return null;

  const lat = Number(data.result.geometry?.location?.lat ?? 0);
  const lng = Number(data.result.geometry?.location?.lng ?? 0);
  const display = String(data.result.formatted_address ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !display) return null;
  return { lat, lng, display };
}

// ─── Geocoding par texte ──────────────────────────────────────────────

export async function geocodeAddress(query: string): Promise<GeoResult[]> {
  const key = ensureKey();
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(query)}` +
    `&key=${encodeURIComponent(key)}` +
    `&language=fr`;

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!resp.ok) return [];
  const data = await resp.json();
  if (data?.status !== "OK" || !Array.isArray(data.results)) return [];

  return data.results
    .slice(0, 5)
    .map((r: {
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }) => ({
      lat: Number(r.geometry?.location?.lat ?? 0),
      lng: Number(r.geometry?.location?.lng ?? 0),
      display: String(r.formatted_address ?? ""),
    }))
    .filter(
      (r: GeoResult) =>
        Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.display.length > 0,
    );
}

// ─── Reverse geocoding ────────────────────────────────────────────────

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<string | null> {
  const key = ensureKey();
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${encodeURIComponent(`${lat},${lng}`)}` +
    `&key=${encodeURIComponent(key)}` +
    `&language=fr`;

  const resp = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (
    data?.status !== "OK" ||
    !Array.isArray(data.results) ||
    data.results.length === 0
  ) {
    return null;
  }
  return String(data.results[0]?.formatted_address ?? "").trim() || null;
}

// ─── Résolution de liens raccourcis Google Maps ──────────────────────

export async function resolveShortUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
    });
    return resp.url || null;
  } catch {
    try {
      const resp = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      return resp.url || null;
    } catch {
      return null;
    }
  }
}

export function isGoogleConfigured(): boolean {
  return GOOGLE_API_KEY.length > 0;
}
