/**
 * GET /api/mobile/v1/geo/resolve-url?url=<url>
 *
 * Résout les liens raccourcis Google Maps (goo.gl/maps/..., maps.app.goo.gl/...)
 * en suivant les redirections HTTP, puis renvoie l'URL finale.
 *
 * L'app Flutter peut ensuite parser les coordonnées depuis cette URL.
 */

import { NextRequest } from "next/server";

import { errors, ok } from "../../_lib/api-response";
import { requireAnyAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import { resolveShortUrl } from "../../_lib/google-geo";

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

  const resolved = await resolveShortUrl(raw);
  if (!resolved) {
    return errors.unprocessable("Impossible de résoudre l'URL");
  }

  return ok({ originalUrl: raw, resolvedUrl: resolved });
}

export const OPTIONS = preflight;
