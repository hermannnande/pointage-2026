import { NextRequest, NextResponse } from "next/server";

type GeocodeResult = { lat: number; lng: number; display: string };

function googleKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;
}

async function googleSearch(query: string, key: string): Promise<GeocodeResult[]> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}&language=fr`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!resp.ok) return [];
  const data = await resp.json();
  if (data?.status !== "OK" || !Array.isArray(data.results)) return [];

  return data.results.slice(0, 5).map((r: { formatted_address?: string; geometry?: { location?: { lat?: number; lng?: number } } }) => ({
    lat: Number(r.geometry?.location?.lat ?? 0),
    lng: Number(r.geometry?.location?.lng ?? 0),
    display: String(r.formatted_address ?? ""),
  })).filter((r: GeocodeResult) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.display.length > 0);
}

async function googleReverse(lat: number, lng: number, key: string): Promise<string | null> {
  const latlng = `${lat},${lng}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(latlng)}&key=${encodeURIComponent(key)}&language=fr`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data?.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0) return null;
  return String(data.results[0]?.formatted_address ?? "").trim() || null;
}

async function osmSearch(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=fr`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!resp.ok) return [];
  const data = await resp.json();
  if (!Array.isArray(data)) return [];
  return data.map((r: { lat?: string; lon?: string; display_name?: string }) => ({
    lat: Number.parseFloat(r.lat ?? ""),
    lng: Number.parseFloat(r.lon ?? ""),
    display: String(r.display_name ?? ""),
  })).filter((r: GeocodeResult) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.display.length > 0);
}

async function osmReverse(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(6000), cache: "no-store" });
  if (!resp.ok) return null;
  const data = await resp.json();
  const display = String(data?.display_name ?? "").trim();
  return display || null;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode !== "search" && mode !== "reverse") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  try {
    const key = googleKey();

    if (mode === "search") {
      const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
      if (!query) return NextResponse.json({ error: "Missing query" }, { status: 400 });

      if (key) {
        const googleResults = await googleSearch(query, key);
        if (googleResults.length > 0) return NextResponse.json({ provider: "google", results: googleResults });
      }

      const osmResults = await osmSearch(query);
      return NextResponse.json({ provider: "osm", results: osmResults });
    }

    const lat = Number(request.nextUrl.searchParams.get("lat"));
    const lng = Number(request.nextUrl.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    if (key) {
      const googleAddress = await googleReverse(lat, lng, key);
      if (googleAddress) return NextResponse.json({ provider: "google", display: googleAddress });
    }

    const osmAddress = await osmReverse(lat, lng);
    return NextResponse.json({ provider: "osm", display: osmAddress });
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}

