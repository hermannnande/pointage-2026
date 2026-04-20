/**
 * /api/mobile/v1/owner/sites
 *
 * GET  → liste tous les sites de l'entreprise du propriétaire avec leurs
 *        coordonnées GPS, géofence, adresse, et nombre d'employés actifs.
 *
 * POST → crée un nouveau site (réutilise `siteService.createSite`,
 *        validation `createSiteSchema`).
 *
 * Sécurité :
 *   - GET  : auth Supabase + permission `sites.view`
 *   - POST : auth Supabase + permission `sites.create`
 *
 * Réponse GET :
 *   { sites: [ { id, name, code, address, city, latitude, longitude,
 *                geofenceRadius, workStartTime, workEndTime, graceMinutes,
 *                clockInEnabled, isActive, employeeCount } ] }
 *
 * Réponse POST (201) :
 *   { site: { ... } }
 */

import { PERMISSIONS } from "@/config/permissions";
import { prisma } from "@/lib/prisma/client";
import * as siteService from "@/services/site.service";
import { requirePermission } from "@/services/tenant.service";
import { createSiteSchema } from "@/validations/site.schema";

import { errors, ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import { parseAndValidateBody } from "../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SITES_VIEW);
  } catch {
    return errors.forbidden("Permission sites.view requise");
  }

  const companyId = auth.tenant.companyId;

  const sites = await prisma.site.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      code: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      geofenceRadius: true,
      workStartTime: true,
      workEndTime: true,
      graceMinutes: true,
      clockInEnabled: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { employees: { where: { isActive: true } } } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });

  const items = sites.map((s) => ({
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
    employeeCount: s._count.employees,
  }));

  return ok({ sites: items });
}

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SITES_CREATE);
  } catch {
    return errors.forbidden("Permission sites.create requise");
  }

  const validation = await parseAndValidateBody(request, createSiteSchema);
  if (!validation.ok) return validation.response;

  try {
    const created = await siteService.createSite(
      auth.tenant.companyId,
      validation.data,
    );

    return ok(
      {
        site: {
          id: created.id,
          name: created.name,
          code: created.code,
          address: created.address,
          city: created.city,
          latitude: created.latitude,
          longitude: created.longitude,
          geofenceRadius: created.geofenceRadius,
          workStartTime: created.workStartTime,
          workEndTime: created.workEndTime,
          graceMinutes: created.graceMinutes,
          clockInEnabled: created.clockInEnabled,
          isActive: created.isActive,
          createdAt: created.createdAt.toISOString(),
          updatedAt: created.updatedAt.toISOString(),
          employeeCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur création site",
    );
  }
}

export const OPTIONS = preflight;
