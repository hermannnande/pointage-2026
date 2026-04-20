import { ok } from "../_lib/api-response";
import { preflight } from "../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_VERSION = "1.0.0";
const MIN_CLIENT_VERSION = "1.0.0";
const RECOMMENDED_CLIENT_VERSION = "1.0.0";

export async function GET() {
  return ok({
    api: API_VERSION,
    minClient: MIN_CLIENT_VERSION,
    recommendedClient: RECOMMENDED_CLIENT_VERSION,
    deprecation: null as string | null,
    geoProvider: "google_maps_platform",
  });
}

export const OPTIONS = preflight;
