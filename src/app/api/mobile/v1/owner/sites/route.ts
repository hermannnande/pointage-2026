/**
 * GET /api/mobile/v1/owner/sites
 *
 * Liste tous les sites actifs de l'entreprise du propriétaire avec leurs
 * coordonnées GPS, géofence, adresse, et nombre d'employés actifs.
 *
 * Utilisé par :
 *   - le filtre du Pointage en direct (Phase 7)
 *   - la carte d'ensemble du Pointage en direct (markers de sites)
 *   - la liste des Lieux de travail (Phase 9)
 *
 * Réponse :
 *   {
 *     sites: [
 *       {
 *         id, name, code, address, city,
 *         latitude, longitude, geofenceRadius,
 *         workStartTime, workEndTime, graceMinutes,
 *         clockInEnabled, isActive,
 *         employeeCount
 *       }, ...
 *     ]
 *   }
 *
 * Sécurité : auth Supabase owner / admin / manager.
 */

import { prisma } from "@/lib/prisma/client";

import { ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

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
    employeeCount: s._count.employees,
  }));

  return ok({ sites: items });
}

export const OPTIONS = preflight;
