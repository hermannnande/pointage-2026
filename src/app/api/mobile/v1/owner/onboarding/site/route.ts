/**
 * POST /api/mobile/v1/owner/onboarding/site
 *
 * Crée le premier Site de l'entreprise (étape 2 de l'onboarding mobile).
 * Optionnel : l'utilisateur peut skip cette étape et créer ses sites plus
 * tard depuis le dashboard.
 *
 * Body :
 *   {
 *     siteName: string,           // min 2 chars
 *     address?: string,
 *     city?: string,
 *     latitude?: number,
 *     longitude?: number,
 *     geofenceRadius?: number,    // 10..5000 m (défaut 50)
 *     workStartTime?: string,     // HH:mm (défaut 08:00)
 *     workEndTime?: string,       // HH:mm (défaut 17:00)
 *   }
 *
 * Réponse 200 : { siteId: string }
 *
 * Auth : Bearer Supabase + tenant existant (la Company doit être créée avant).
 */

import { createSiteForCompany } from "@/services/company.service";
import { onboardingSiteSchema } from "@/validations/auth.schema";

import { ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  const parsed = await parseAndValidateBody(request, onboardingSiteSchema);
  if (!parsed.ok) return parsed.response;

  const data = parsed.data;
  const site = await createSiteForCompany({
    companyId: auth.tenant.companyId,
    name: data.siteName,
    address: data.address,
    city: data.city,
    latitude: data.latitude,
    longitude: data.longitude,
    geofenceRadius: data.geofenceRadius,
    workStartTime: data.workStartTime,
    workEndTime: data.workEndTime,
  });

  return ok({ siteId: site.id });
}

export const OPTIONS = preflight;
