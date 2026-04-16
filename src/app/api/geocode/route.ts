import { NextRequest, NextResponse } from "next/server";

type GeocodeResult = { lat: number; lng: number; display: string };

const GOOGLE_API_KEY =
  process.env.GOOGLE_MAPS_API_KEY ??
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ??
  "AIzaSyCtxUtIXd_XMqF0c-QY8xCOERd9LcuK13o";

async function placesAutocomplete(
  query: string,
): Promise<Array<{ placeId: string; display: string }>> {
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${encodeURIComponent(GOOGLE_API_KEY)}&language=fr&types=geocode|establishment`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!resp.ok) return [];
  const data = await resp.json();
  if (data?.status !== "OK" || !Array.isArray(data.predictions)) return [];

  return data.predictions.slice(0, 8).map(
    (p: { place_id?: string; description?: string }) => ({
      placeId: String(p.place_id ?? ""),
      display: String(p.description ?? ""),
    }),
  ).filter((p: { placeId: string; display: string }) => p.placeId && p.display);
}

async function placeDetails(placeId: string): Promise<GeocodeResult | null> {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry,formatted_address&key=${encodeURIComponent(GOOGLE_API_KEY)}&language=fr`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data?.status !== "OK" || !data.result) return null;

  const lat = Number(data.result.geometry?.location?.lat ?? 0);
  const lng = Number(data.result.geometry?.location?.lng ?? 0);
  const display = String(data.result.formatted_address ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !display) return null;
  return { lat, lng, display };
}

async function googleSearch(query: string): Promise<GeocodeResult[]> {
  const predictions = await placesAutocomplete(query);
  if (predictions.length === 0) {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(GOOGLE_API_KEY)}&language=fr`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!resp.ok) return [];
    const data = await resp.json();
    if (data?.status !== "OK" || !Array.isArray(data.results)) return [];
    return data.results
      .slice(0, 5)
      .map(
        (r: {
          formatted_address?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }) => ({
          lat: Number(r.geometry?.location?.lat ?? 0),
          lng: Number(r.geometry?.location?.lng ?? 0),
          display: String(r.formatted_address ?? ""),
        }),
      )
      .filter(
        (r: GeocodeResult) =>
          Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.display.length > 0,
      );
  }

  const detailsPromises = predictions.map((p) => placeDetails(p.placeId));
  const details = await Promise.all(detailsPromises);
  return details.filter((d): d is GeocodeResult => d !== null);
}

async function googleReverse(lat: number, lng: number): Promise<string | null> {
  const latlng = `${lat},${lng}`;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(latlng)}&key=${encodeURIComponent(GOOGLE_API_KEY)}&language=fr`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000), cache: "no-store" });
  if (!resp.ok) return null;
  const data = await resp.json();
  if (data?.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0)
    return null;
  return String(data.results[0]?.formatted_address ?? "").trim() || null;
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get("mode");
  if (mode !== "search" && mode !== "reverse") {
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

  try {
    if (mode === "search") {
      const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
      if (!query)
        return NextResponse.json({ error: "Missing query" }, { status: 400 });

      const results = await googleSearch(query);
      return NextResponse.json({ provider: "google", results });
    }

    const lat = Number(request.nextUrl.searchParams.get("lat"));
    const lng = Number(request.nextUrl.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const display = await googleReverse(lat, lng);
    return NextResponse.json({ provider: "google", display });
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
  }
}
