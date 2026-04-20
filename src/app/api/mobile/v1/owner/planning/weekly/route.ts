/**
 * /api/mobile/v1/owner/planning/weekly
 *
 * GET → vue hebdomadaire : pour chaque employé (filtrable par site),
 *       son planning actif (shifts) + ses pointages sur la semaine.
 *
 * Query params :
 *   - siteId?      : filtre par lieu
 *   - weekStart?   : ISO date (lundi). Si absent → lundi de la semaine en cours.
 */

import { PERMISSIONS } from "@/config/permissions";
import * as scheduleService from "@/services/schedule.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_VIEW);
  } catch {
    return errors.forbidden("Permission schedules.view requise");
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") || undefined;
  const weekStart = searchParams.get("weekStart") || undefined;

  try {
    const view = await scheduleService.getWeeklyView(
      auth.tenant.companyId,
      siteId,
      weekStart,
    );
    return ok({
      weekStart: view.weekStart,
      weekEnd: view.weekEnd,
      employees: view.employees.map((emp) => ({
        id: emp.id,
        firstName: emp.firstName,
        lastName: emp.lastName,
        position: emp.position,
        site: emp.site ? { id: emp.site.id, name: emp.site.name } : null,
        schedule: emp.schedule
          ? {
              id: emp.schedule.id,
              name: emp.schedule.name,
              shifts: emp.schedule.shifts.map((sh) => ({
                dayOfWeek: sh.dayOfWeek,
                startTime: sh.startTime,
                endTime: sh.endTime,
                breakMinutes: sh.breakMinutes,
                isWorkDay: sh.isWorkDay,
              })),
            }
          : null,
        attendance: emp.attendance.map((r) => ({
          date: r.date.toISOString(),
          status: r.status,
          clockIn: r.clockIn ? r.clockIn.toISOString() : null,
          clockOut: r.clockOut ? r.clockOut.toISOString() : null,
          workedMinutes: r.workedMinutes ?? 0,
          isLate: r.isLate ?? false,
          lateMinutes: r.lateMinutes ?? 0,
        })),
      })),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur vue hebdomadaire",
    );
  }
}

export const OPTIONS = preflight;
