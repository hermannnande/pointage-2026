/**
 * Résolveur intelligent de liens de localisation partagés (Google Maps /
 * WhatsApp) — logique centralisée côté serveur.
 *
 * Objectif : être PRÉCIS. Un lien partagé contient souvent plusieurs
 * coordonnées, et la plus visible n'est pas la bonne :
 *   - `!3d<lat>!4d<lng>` → position EXACTE du repère (pin)
 *   - `@<lat>,<lng>,<zoom>` → simple centre de la VUE carte (peut être à
 *     plusieurs centaines de mètres du lieu — source du bug « Hors périmètre »)
 *
 * Cascade de précision (du plus fiable au moins fiable) :
 *   1. `!3d!4d` dans l'URL                  → pin exact
 *   2. `?q= / ?ll= / ?center= / ?query=…`   → coordonnées explicites
 *   3. Place ID (`!1sChIJ…`) → Place Details API → position officielle Google
 *   4. Nom du lieu (`/place/<nom>/`) géocodé, croisé avec le centre de vue
 *      (on ne retient un résultat que s'il est proche du centre de vue)
 *   5. Extraction depuis le HTML de la page (redirections JavaScript)
 *   6. `@lat,lng` (centre de vue) — dernier recours uniquement
 *
 * Compatibilité : si les coordonnées trouvées ne figurent PAS déjà dans
 * l'URL résolue, elles sont ajoutées en fragment `#!3d…!4d…` pour que les
 * anciens clients (APK ≤ 1.0.24, picker web) qui parsent l'URL en local
 * en profitent immédiatement, sans mise à jour.
 */

import {
  geocodeAddress,
  placeDetails,
} from "@/app/api/mobile/v1/_lib/google-geo";

export type GeoLinkSource =
  | "pin"
  | "query"
  | "place-id"
  | "name"
  | "html"
  | "viewport";

export interface ResolvedGeoLink {
  originalUrl: string;
  resolvedUrl: string;
  lat: number | null;
  lng: number | null;
  source: GeoLinkSource | null;
  placeName: string | null;
}

const NUM = "-?\\d+(?:\\.\\d+)?";
const BANG_RE = new RegExp(`!3d(${NUM})!4d(${NUM})`);
const AT_RE = new RegExp(`@(${NUM}),(${NUM})(?:,|$|[,/])`);
const QUERY_KEYS = ["q", "ll", "center", "destination", "daddr", "query"];
const PLACE_ID_RE = /!1s(ChIJ[\w-]+)/;
const PLACE_ID_QUERY_RE = /(?:^|[?&])(?:q|query)=place_id:([\w-]+)/;
const PLACE_NAME_RE = /\/maps\/(?:[^/]+\/)?place\/([^/@?#]+)/;
const STATICMAP_CENTER_RE = new RegExp(`center=(${NUM})[,%2C]+(${NUM})`, "i");

/** Distance approximative en mètres (haversine simplifié). */
function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

function toCoord(
  rawLat: string | undefined,
  rawLng: string | undefined,
): { lat: number; lng: number } | null {
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  return isValidCoord(lat, lng) ? { lat, lng } : null;
}

/** 1-2. Coordonnées fiables présentes dans l'URL (pin ou paramètre explicite). */
function extractPreciseFromUrl(
  url: string,
): { lat: number; lng: number; source: GeoLinkSource } | null {
  const bang = BANG_RE.exec(url);
  const fromBang = toCoord(bang?.[1], bang?.[2]);
  if (fromBang) return { ...fromBang, source: "pin" };

  let parsed: URL | null = null;
  try {
    parsed = new URL(url);
  } catch {
    parsed = null;
  }
  if (parsed) {
    for (const key of QUERY_KEYS) {
      const value = parsed.searchParams.get(key);
      if (!value) continue;
      const m = new RegExp(`^(${NUM})\\s*,\\s*(${NUM})$`).exec(value.trim());
      const coord = toCoord(m?.[1], m?.[2]);
      if (coord) return { ...coord, source: "query" };
    }
  }
  return null;
}

/** 6. Centre de la vue carte — utilisé en dernier recours ou comme référence. */
function extractViewport(url: string): { lat: number; lng: number } | null {
  const at = AT_RE.exec(url);
  return toCoord(at?.[1], at?.[2]);
}

function extractPlaceId(url: string): string | null {
  const fromBang = PLACE_ID_RE.exec(url);
  if (fromBang?.[1]) return fromBang[1];
  const fromQuery = PLACE_ID_QUERY_RE.exec(url);
  return fromQuery?.[1] ?? null;
}

function extractPlaceName(url: string): string | null {
  const m = PLACE_NAME_RE.exec(url);
  if (!m?.[1]) return null;
  const name = decodeURIComponent(m[1]).replace(/\+/g, " ").trim();
  // Ignore les segments génériques sans valeur de recherche.
  return name.length >= 2 ? name : null;
}

/** 5. Extraction depuis le HTML d'une page Google Maps (redirection JS). */
function extractFromHtml(html: string): { lat: number; lng: number } | null {
  const bang = BANG_RE.exec(html);
  const fromBang = toCoord(bang?.[1], bang?.[2]);
  if (fromBang) return fromBang;

  // og:image des fiches lieu = staticmap centré sur le lieu.
  const center = STATICMAP_CENTER_RE.exec(html);
  const fromCenter = toCoord(center?.[1], center?.[2]);
  if (fromCenter) return fromCenter;

  return null;
}

interface FetchOutcome {
  finalUrl: string;
  html: string | null;
}

/** Suit les redirections ; récupère le HTML si la page ne redirige pas en 3xx. */
async function fetchFinal(url: string, needHtml: boolean): Promise<FetchOutcome | null> {
  if (!needHtml) {
    try {
      const resp = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: AbortSignal.timeout(5000),
      });
      if (resp.url) return { finalUrl: resp.url, html: null };
    } catch {
      /* on tente GET ci-dessous */
    }
  }
  try {
    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(6000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36",
        "accept-language": "fr",
      },
    });
    const contentType = resp.headers.get("content-type") ?? "";
    const html = contentType.includes("text/html") ? await resp.text() : null;
    return { finalUrl: resp.url || url, html };
  } catch {
    return null;
  }
}

/**
 * Point d'entrée : résout un lien partagé et renvoie les meilleures
 * coordonnées possibles avec leur provenance.
 */
export async function resolveSharedLocationLink(
  rawUrl: string,
): Promise<ResolvedGeoLink | null> {
  const base: Omit<ResolvedGeoLink, "resolvedUrl"> = {
    originalUrl: rawUrl,
    lat: null,
    lng: null,
    source: null,
    placeName: null,
  };

  // Étape 1 : résolution HTTP (HEAD rapide, sans HTML pour l'instant).
  const head = await fetchFinal(rawUrl, false);
  const candidateUrl = head?.finalUrl ?? rawUrl;

  // Étape 2 : coordonnées précises déjà dans l'URL finale (pin ou query).
  let coords = extractPreciseFromUrl(candidateUrl);
  let html: string | null = head?.html ?? null;

  // Étape 3 : Place ID → API Place Details (position officielle).
  if (!coords) {
    const placeId = extractPlaceId(candidateUrl);
    if (placeId) {
      try {
        const details = await placeDetails(placeId);
        if (details) {
          coords = { lat: details.lat, lng: details.lng, source: "place-id" };
        }
      } catch {
        /* clé absente ou API KO — on continue la cascade */
      }
    }
  }

  // Étape 4 : nom du lieu géocodé, validé par proximité avec le centre de vue.
  if (!coords) {
    const name = extractPlaceName(candidateUrl);
    const viewport = extractViewport(candidateUrl);
    if (name) {
      try {
        const results = await geocodeAddress(name);
        if (results.length > 0) {
          const best = viewport
            ? results
                .map((r) => ({
                  r,
                  d: distanceMeters(r.lat, r.lng, viewport.lat, viewport.lng),
                }))
                .sort((a, b) => a.d - b.d)[0]
            : null;
          // Avec centre de vue : on exige une cohérence ≤ 2 km (sinon le nom
          // est ambigu et on ne prend pas le risque). Sans centre de vue :
          // premier résultat, moins fiable mais mieux que rien.
          if (best && best.d <= 2000) {
            coords = { lat: best.r.lat, lng: best.r.lng, source: "name" };
          } else if (!viewport) {
            coords = {
              lat: results[0].lat,
              lng: results[0].lng,
              source: "name",
            };
          }
        }
      } catch {
        /* API KO — on continue */
      }
    }
  }

  // Étape 5 : HTML de la page (certains liens n'exposent le pin qu'au rendu).
  if (!coords) {
    if (html === null) {
      const withHtml = await fetchFinal(rawUrl, true);
      if (withHtml) {
        html = withHtml.html;
        // L'URL finale d'un GET peut être plus complète que celle du HEAD.
        if (withHtml.finalUrl !== candidateUrl) {
          const retry = extractPreciseFromUrl(withHtml.finalUrl);
          if (retry) coords = retry;
        }
      }
    }
    if (!coords && html) {
      const fromHtml = extractFromHtml(html);
      if (fromHtml) coords = { ...fromHtml, source: "html" };
    }
  }

  // Étape 6 : centre de la vue — dernier recours.
  if (!coords) {
    const viewport = extractViewport(candidateUrl);
    if (viewport) coords = { ...viewport, source: "viewport" };
  }

  if (!coords && !head) return null;

  // Compatibilité anciens clients : si les coords retenues ne sont pas déjà
  // exprimées en `!3d!4d` dans l'URL, on les ajoute en fragment pour que le
  // parsing local des clients ≤ 1.0.24 tombe dessus en priorité.
  let resolvedUrl = candidateUrl;
  if (coords && coords.source !== "viewport" && !BANG_RE.test(resolvedUrl)) {
    resolvedUrl += `#!3d${coords.lat}!4d${coords.lng}`;
  }

  return {
    ...base,
    resolvedUrl,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
    source: coords?.source ?? null,
  };
}
