import { ok } from "../_lib/api-response";
import { preflight } from "../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return ok({
    status: "online",
    service: "ocontrole-mobile-api",
    time: new Date().toISOString(),
  });
}

export const OPTIONS = preflight;
