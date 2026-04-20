/**
 * /api/mobile/v1/owner/planning/templates
 *
 * GET → liste des plannings marqués `isTemplate = true` (pour pré-remplir
 *       un nouveau planning depuis un modèle).
 */

import { PERMISSIONS } from "@/config/permissions";
import * as scheduleService from "@/services/schedule.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SCHEDULES_VIEW);
  } catch {
    return errors.forbidden("Permission schedules.view requise");
  }

  try {
    const templates = await scheduleService.getScheduleTemplates(
      auth.tenant.companyId,
    );
    return ok({
      templates: templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        shifts: t.shifts.map((sh) => ({
          dayOfWeek: sh.dayOfWeek,
          startTime: sh.startTime,
          endTime: sh.endTime,
          breakMinutes: sh.breakMinutes,
          isWorkDay: sh.isWorkDay,
        })),
      })),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur chargement modèles",
    );
  }
}

export const OPTIONS = preflight;
