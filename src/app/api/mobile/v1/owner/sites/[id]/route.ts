/**
 * /api/mobile/v1/owner/sites/[id]
 *
 * GET    → détail d'un site (avec départements actifs et nb employés)
 * PATCH  → met à jour un site (réutilise `siteService.updateSite`,
 *          validation `updateSiteSchema`)
 * DELETE → supprime un site (refus si employés actifs liés)
 *
 * Sécurité :
 *   - GET    : auth Supabase + permission `sites.view`
 *   - PATCH  : auth Supabase + permission `sites.update`
 *   - DELETE : auth Supabase + permission `sites.delete`
 */

import { PERMISSIONS } from "@/config/permissions";
import * as siteService from "@/services/site.service";
import { requirePermission } from "@/services/tenant.service";
import { updateSiteSchema } from "@/validations/site.schema";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function serializeSite(s: {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  geofenceRadius: number;
  workStartTime: string | null;
  workEndTime: string | null;
  graceMinutes: number;
  clockInEnabled: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: s.id,
    name: s.name,
    code: s.code,
    address: s.address,
    city: s.city,
    latitude: s.latitude,
    longitude: s.longitude,
    geofenceRadius: s.geofenceRadius,
    workStartTime: s.workStartTime,
    workEndTime: s.workEndTime,
    graceMinutes: s.graceMinutes,
    clockInEnabled: s.clockInEnabled,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export async function GET(_request: Request, ctx: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SITES_VIEW);
  } catch {
    return errors.forbidden("Permission sites.view requise");
  }

  const { id } = await ctx.params;
  if (!id) return errors.badRequest("Identifiant manquant");

  const site = await siteService.getSiteById(auth.tenant.companyId, id);
  if (!site) return errors.notFound("Lieu de travail introuvable");

  return ok({
    site: {
      ...serializeSite(site),
      employeeCount: site._count.employees,
      departments: site.departments.map((d) => ({
        id: d.id,
        name: d.name,
      })),
    },
  });
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SITES_UPDATE);
  } catch {
    return errors.forbidden("Permission sites.update requise");
  }

  const { id } = await ctx.params;
  if (!id) return errors.badRequest("Identifiant manquant");

  // S'assurer que le site appartient bien à l'entreprise
  const existing = await siteService.getSiteById(auth.tenant.companyId, id);
  if (!existing) return errors.notFound("Lieu de travail introuvable");

  const validation = await parseAndValidateBody(request, updateSiteSchema);
  if (!validation.ok) return validation.response;

  // Forcer l'id en path à overrider le body
  const payload = { ...validation.data, id };

  try {
    const updated = await siteService.updateSite(
      auth.tenant.companyId,
      payload,
    );
    return ok({ site: serializeSite(updated) });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur mise à jour site",
    );
  }
}

export async function DELETE(_request: Request, ctx: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SITES_DELETE);
  } catch {
    return errors.forbidden("Permission sites.delete requise");
  }

  const { id } = await ctx.params;
  if (!id) return errors.badRequest("Identifiant manquant");

  try {
    await siteService.deleteSite(auth.tenant.companyId, id);
    return ok({ deleted: true, id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur suppression site";
    if (msg.includes("introuvable")) return errors.notFound(msg);
    if (msg.includes("employés actifs")) return errors.conflict(msg);
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
