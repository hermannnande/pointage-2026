/**
 * /api/mobile/v1/owner/planning/schedules
 *
 * GET  → liste tous les plannings (avec shifts + nombre d'affectations actives).
 * POST → crée un nouveau planning (réutilise scheduleService.createSchedule
 *        + createScheduleSchema).
 *
 * Sécurité :
 *   - GET  : auth Supabase + permission `schedules.view`
 *   - POST : auth Supabase + permission `schedules.manage`
 */

import { PERMISSIONS } from "@/config/permissions";
import * as scheduleService from "@/services/schedule.service";
import { requirePermission } from "@/services/tenant.service";
import { createScheduleSchema } from "@/validations/schedule.schema";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Sched = Awaited<ReturnType<typeof scheduleService.getSchedules>>[number];

function serializeSchedule(s: Sched) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    isTemplate: s.isTemplate,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    activeAssignmentsCount: s._count.assignments,
    shifts: s.shifts.map((sh) => ({
      id: sh.id,
      dayOfWeek: sh.dayOfWeek,
      startTime: sh.startTime,
      endTime: sh.endTime,
      breakMinutes: sh.breakMinutes,
      isWorkDay: sh.isWorkDay,
    })),
  };
}

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_VIEW);
  } catch {
    return errors.forbidden("Permission schedules.view requise");
  }

  try {
    const schedules = await scheduleService.getSchedules(auth.tenant.companyId);
    return ok({ schedules: schedules.map(serializeSchedule) });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur de chargement des plannings",
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_MANAGE);
  } catch {
    return errors.forbidden("Permission schedules.manage requise");
  }

  const validation = await parseAndValidateBody(request, createScheduleSchema);
  if (!validation.ok) return validation.response;

  try {
    const created = await scheduleService.createSchedule(
      auth.tenant.companyId,
      validation.data,
    );
    const fresh = await scheduleService.getScheduleById(
      auth.tenant.companyId,
      created.id,
    );
    if (!fresh) return errors.serverError("Planning créé mais introuvable");
    return ok({ schedule: serializeScheduleDetail(fresh) }, { status: 201 });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur création planning",
    );
  }
}

export const OPTIONS = preflight;

// ─── Sérialisation détaillée (utilisée aussi par /[id]/route.ts) ────────

type SchedDetail = NonNullable<
  Awaited<ReturnType<typeof scheduleService.getScheduleById>>
>;

export function serializeScheduleDetail(s: SchedDetail) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    isTemplate: s.isTemplate,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    shifts: s.shifts.map((sh) => ({
      id: sh.id,
      dayOfWeek: sh.dayOfWeek,
      startTime: sh.startTime,
      endTime: sh.endTime,
      breakMinutes: sh.breakMinutes,
      isWorkDay: sh.isWorkDay,
    })),
    assignments: s.assignments.map((a) => ({
      id: a.id,
      startDate: a.startDate.toISOString(),
      endDate: a.endDate ? a.endDate.toISOString() : null,
      isActive: a.isActive,
      employee: {
        id: a.employee.id,
        firstName: a.employee.firstName,
        lastName: a.employee.lastName,
        position: a.employee.position,
        site: a.employee.site
          ? { id: a.employee.site.id, name: a.employee.site.name }
          : null,
      },
    })),
  };
}
