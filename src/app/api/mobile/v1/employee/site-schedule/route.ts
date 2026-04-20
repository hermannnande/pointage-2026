/**
 * GET /api/mobile/v1/employee/site-schedule
 *
 * Renvoie les infos du lieu de travail de l'employé : coordonnées,
 * rayon de geofence, horaires de fin, etc. Utilisé par l'écran de pointage
 * pour afficher la carte et calculer la distance au site.
 */

import { prisma } from "@/lib/prisma/client";

import { ok } from "../../_lib/api-response";
import { requireEmployeeAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { session } = auth;
  const employee = await prisma.employee.findFirst({
    where: { id: session.employeeId, companyId: session.companyId },
    select: {
      site: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
          latitude: true,
          longitude: true,
          geofenceRadius: true,
          workStartTime: true,
          workEndTime: true,
          graceMinutes: true,
          clockInEnabled: true,
        },
      },
    },
  });

  return ok({
    site: employee?.site ?? null,
  });
}

export const OPTIONS = preflight;
