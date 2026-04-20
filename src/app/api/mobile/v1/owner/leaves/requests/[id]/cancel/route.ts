/**
 * /api/mobile/v1/owner/leaves/requests/[id]/cancel
 *
 * POST → annule une demande de congé en attente.
 */

import { PERMISSIONS } from "@/config/permissions";
import * as leaveService from "@/services/leave.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../../../_lib/api-response";
import { requireOwnerAuth } from "../../../../../_lib/auth";
import { preflight } from "../../../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.LEAVES_REQUEST);
  } catch {
    return errors.forbidden("Permission leaves.request requise");
  }

  const { id } = await context.params;

  try {
    const cancelled = await leaveService.cancelLeaveRequest(
      auth.tenant.companyId,
      id,
    );
    return ok({
      request: { id: cancelled.id, status: cancelled.status },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur annulation";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    if (msg.toLowerCase().includes("annulées")) return errors.conflict(msg);
    return errors.badRequest(msg);
  }
}

export const OPTIONS = preflight;
