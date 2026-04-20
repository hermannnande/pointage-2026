/**
 * /api/mobile/v1/owner/planning/assignments/[id]
 *
 * DELETE → désactive (soft) une affectation (passe `isActive = false`
 *          et fixe `endDate = now`).
 */

import { PERMISSIONS } from "@/config/permissions";
import * as scheduleService from "@/services/schedule.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../../_lib/api-response";
import { requireOwnerAuth } from "../../../../_lib/auth";
import { preflight } from "../../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
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
    await scheduleService.unassignSchedule(auth.tenant.companyId, id);
    return ok({ unassigned: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur désaffectation";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
