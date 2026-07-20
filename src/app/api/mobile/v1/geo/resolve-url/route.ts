import { NextRequest } from "next/server";

import { resolveSharedLocationLink } from "@/lib/geo-link-resolver";

import { errors, ok } from "../../_lib/api-response";
import { requireAnyAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_HOSTS = new Set([
  "goo.gl",
  "maps.app.goo.gl",
  "maps.google.com",
  "www.google.com",
  "google.com",
  "g.co",
]);

export async function GET(request: NextRequest) {
  const auth = await requireAnyAuth();
  if (!auth.ok) return auth.response;

  const raw = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!raw) {
    return errors.badRequest("Paramètre 'url' requis");
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return errors.badRequest("URL invalide");
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return errors.badRequest("Protocole non autorisé");
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return errors.badRequest("Domaine non autorisé (Google Maps uniquement)");
  }

  // Cascade de précision centralisée : pin > query > Place Details >
  // nom géocodé croisé > HTML > centre de vue (cf. geo-link-resolver).
  const resolved = await resolveSharedLocationLink(raw);
  if (!resolved) {
    return errors.unprocessable("Impossible de résoudre l'URL");
  }

  return ok({
    originalUrl: resolved.originalUrl,
    resolvedUrl: resolved.resolvedUrl,
    lat: resolved.lat,
    lng: resolved.lng,
    source: resolved.source,
  });
}

export const OPTIONS = preflight;
