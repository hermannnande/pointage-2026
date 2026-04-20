/**
 * /api/mobile/v1/owner/planning/schedules/[id]
 *
 * GET    → détail d'un planning (shifts + affectations actives).
 * PATCH  → modifie nom/description/actif/template/shifts.
 * DELETE → supprime le planning (refuse s'il a des affectations actives).
 */

import { PERMISSIONS } from "@/config/permissions";
import * as scheduleService from "@/services/schedule.service";
import { requirePermission } from "@/services/tenant.service";
import { updateScheduleSchema } from "@/validations/schedule.schema";

import { errors, ok } from "../../../../_lib/api-response";
import { requireOwnerAuth } from "../../../../_lib/auth";
import { preflight } from "../../../../_lib/cors";
import { parseAndValidateBody } from "../../../../_lib/validation";

import { serializeScheduleDetail } from "../route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = updateScheduleSchema.omit({ id: true });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_VIEW);
  } catch {
    return errors.forbidden("Permission schedules.view requise");
  }

  const { id } = await context.params;

  try {
    const sched = await scheduleService.getScheduleById(
      auth.tenant.companyId,
      id,
    );
    if (!sched) return errors.notFound("Planning introuvable");
    return ok({ schedule: serializeScheduleDetail(sched) });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur de chargement du planning",
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_MANAGE);
  } catch {
    return errors.forbidden("Permission schedules.manage requise");
  }

  const { id } = await context.params;
  const validation = await parseAndValidateBody(request, patchSchema);
  if (!validation.ok) return validation.response;

  try {
    await scheduleService.updateSchedule(auth.tenant.companyId, {
      id,
      ...validation.data,
    });
    const fresh = await scheduleService.getScheduleById(
      auth.tenant.companyId,
      id,
    );
    if (!fresh) return errors.notFound("Planning introuvable");
    return ok({ schedule: serializeScheduleDetail(fresh) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur mise à jour planning";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    return errors.serverError(msg);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_MANAGE);
  } catch {
    return errors.forbidden("Permission schedules.manage requise");
  }

  const { id } = await context.params;

  try {
    await scheduleService.deleteSchedule(auth.tenant.companyId, id);
    return ok({ deleted: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur suppression planning";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    if (msg.toLowerCase().includes("affectations")) return errors.conflict(msg);
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
