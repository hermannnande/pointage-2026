/**
 * /api/mobile/v1/owner/planning/assignments
 *
 * POST → assigne un planning à une liste d'employés (multi-sélection).
 *        Désactive automatiquement les affectations précédentes.
 */

import { PERMISSIONS } from "@/config/permissions";
import * as scheduleService from "@/services/schedule.service";
import { requirePermission } from "@/services/tenant.service";
import { assignScheduleSchema } from "@/validations/schedule.schema";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_MANAGE);
  } catch {
    return errors.forbidden("Permission schedules.manage requise");
  }

  const validation = await parseAndValidateBody(request, assignScheduleSchema);
  if (!validation.ok) return validation.response;

  try {
    const assignments = await scheduleService.assignSchedule(
      auth.tenant.companyId,
      validation.data,
    );
    return ok(
      {
        count: assignments.length,
        assignments: assignments.map((a) => ({
          id: a.id,
          scheduleId: a.scheduleId,
          employeeId: a.employeeId,
          startDate: a.startDate.toISOString(),
          endDate: a.endDate ? a.endDate.toISOString() : null,
          isActive: a.isActive,
        })),
      },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur affectation";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    if (msg.toLowerCase().includes("aucun")) return errors.badRequest(msg);
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
