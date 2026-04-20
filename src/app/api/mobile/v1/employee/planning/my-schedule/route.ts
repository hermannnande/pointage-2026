/**
 * /api/mobile/v1/employee/planning/my-schedule
 *
 * GET → renvoie le planning actif assigné à l'employé connecté
 *       (semaine type avec shifts par jour). Retourne `null` si non assigné.
 *
 * Sécurité : auth employé (HMAC).
 */

import * as scheduleService from "@/services/schedule.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  try {
    const assignment = await scheduleService.getEmployeeSchedule(
      auth.session.companyId,
      auth.session.employeeId,
    );

    if (!assignment) {
      return ok({ assignment: null });
    }

    return ok({
      assignment: {
        id: assignment.id,
        startDate: assignment.startDate.toISOString(),
        endDate: assignment.endDate ? assignment.endDate.toISOString() : null,
        schedule: {
          id: assignment.schedule.id,
          name: assignment.schedule.name,
          description: assignment.schedule.description,
          shifts: assignment.schedule.shifts.map((sh) => ({
            id: sh.id,
            dayOfWeek: sh.dayOfWeek,
            startTime: sh.startTime,
            endTime: sh.endTime,
            breakMinutes: sh.breakMinutes,
            isWorkDay: sh.isWorkDay,
          })),
        },
      },
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur récupération planning",
    );
  }
}

export const OPTIONS = preflight;
