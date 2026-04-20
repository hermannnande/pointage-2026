/**
 * /api/mobile/v1/owner/leaves/types
 *
 * GET  → liste des types de congés.
 * POST → crée un nouveau type (requiert `settings.manage`).
 */

import { PERMISSIONS } from "@/config/permissions";
import * as leaveService from "@/services/leave.service";
import { requirePermission } from "@/services/tenant.service";
import { createLeaveTypeSchema } from "@/validations/leave.schema";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LType = Awaited<ReturnType<typeof leaveService.getLeaveTypes>>[number];

export function serializeLeaveType(t: LType) {
  return {
    id: t.id,
    name: t.name,
    slug: t.slug,
    color: t.color,
    defaultDays: t.defaultDays,
    isPaid: t.isPaid,
    requiresDoc: t.requiresDoc,
    isActive: t.isActive,
    createdAt: t.createdAt.toISOString(),
  };
}

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.LEAVES_VIEW);
  } catch {
    return errors.forbidden("Permission leaves.view requise");
  }

  try {
    const types = await leaveService.getLeaveTypes(auth.tenant.companyId);
    return ok({ types: types.map(serializeLeaveType) });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur chargement types",
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.SETTINGS_MANAGE);
  } catch {
    return errors.forbidden("Permission settings.manage requise");
  }

  const validation = await parseAndValidateBody(request, createLeaveTypeSchema);
  if (!validation.ok) return validation.response;

  try {
    const created = await leaveService.createLeaveType(
      auth.tenant.companyId,
      validation.data,
    );
    return ok({ type: serializeLeaveType(created) }, { status: 201 });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur création type",
    );
  }
}

export const OPTIONS = preflight;
