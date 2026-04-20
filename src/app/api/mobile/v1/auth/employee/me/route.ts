/**
 * GET /api/mobile/v1/auth/employee/me
 *
 * Vérifie le token HMAC employé (Authorization: Bearer ...) et renvoie
 * les infos de session + données fraîches de l'employé.
 */

import { prisma } from "@/lib/prisma/client";

import { errors, ok } from "../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { session } = auth;

  const employee = await prisma.employee.findFirst({
    where: { id: session.employeeId, companyId: session.companyId },
    include: {
      site: {
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          geofenceRadius: true,
          workStartTime: true,
          workEndTime: true,
        },
      },
      company: {
        select: { id: true, name: true, currency: true, timezone: true, country: true },
      },
    },
  });

  if (!employee || !employee.isActive) {
    return errors.unauthorized("Compte désactivé");
  }

  return ok({
    expiresAt: new Date(session.exp).toISOString(),
    employee: {
      id: employee.id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      matricule: employee.matricule,
      phone: session.phone,
      photoUrl: employee.photoUrl,
      position: employee.position,
    },
    site: employee.site,
    company: employee.company,
  });
}

export const OPTIONS = preflight;
