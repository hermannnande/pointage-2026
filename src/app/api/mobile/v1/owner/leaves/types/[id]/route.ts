/**
 * /api/mobile/v1/owner/leaves/types/[id]
 *
 * PATCH  → met à jour un type de congé.
 * DELETE → supprime un type (refuse s'il est utilisé par des demandes).
 */

import { PERMISSIONS } from "@/config/permissions";
import * as leaveService from "@/services/leave.service";
import { requirePermission } from "@/services/tenant.service";
import { updateLeaveTypeSchema } from "@/validations/leave.schema";

import { errors, ok } from "../../../../_lib/api-response";
import { requireOwnerAuth } from "../../../../_lib/auth";
import { preflight } from "../../../../_lib/cors";
import { parseAndValidateBody } from "../../../../_lib/validation";

import { serializeLeaveType } from "../route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const patchSchema = updateLeaveTypeSchema.omit({ id: true });

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SETTINGS_MANAGE);
  } catch {
    return errors.forbidden("Permission settings.manage requise");
  }

  const { id } = await context.params;
  const validation = await parseAndValidateBody(request, patchSchema);
  if (!validation.ok) return validation.response;

  try {
    const updated = await leaveService.updateLeaveType(auth.tenant.companyId, {
      id,
      ...validation.data,
    });
    return ok({ type: serializeLeaveType(updated) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur mise à jour type";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    return errors.serverError(msg);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SETTINGS_MANAGE);
  } catch {
    return errors.forbidden("Permission settings.manage requise");
  }

  const { id } = await context.params;

  try {
    await leaveService.deleteLeaveType(auth.tenant.companyId, id);
    return ok({ deleted: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur suppression type";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    if (msg.toLowerCase().includes("utilisé")) return errors.conflict(msg);
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
