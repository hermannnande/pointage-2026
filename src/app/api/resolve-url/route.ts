import { NextRequest, NextResponse } from "next/server";

import { resolveSharedLocationLink } from "@/lib/geo-link-resolver";

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
  const url = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Protocol not allowed" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json(
      { error: "Domain not allowed (Google Maps only)" },
      { status: 400 },
    );
  }

  // Cascade de précision centralisée : renvoie l'URL résolue ET les
  // coordonnées exactes quand elles sont identifiables (pin, Place
  // Details, géocodage croisé, HTML…). Le centre de vue `@lat,lng`
  // n'est utilisé qu'en dernier recours.
  const resolved = await resolveSharedLocationLink(url);
  if (!resolved) {
    return NextResponse.json({ error: "Could not resolve URL" }, { status: 422 });
  }

  return NextResponse.json({
    resolvedUrl: resolved.resolvedUrl,
    lat: resolved.lat,
    lng: resolved.lng,
    source: resolved.source,
  });
}
