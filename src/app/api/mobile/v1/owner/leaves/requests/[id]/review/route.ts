/**
 * /api/mobile/v1/owner/leaves/requests/[id]/review
 *
 * POST → approuve ou rejette une demande de congé en attente.
 *        Body : { status: "APPROVED" | "REJECTED", reviewNote?: string }
 */

import { z } from "zod/v4";
import { PERMISSIONS } from "@/config/permissions";
import * as leaveService from "@/services/leave.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../../../_lib/api-response";
import { requireOwnerAuth } from "../../../../../_lib/auth";
import { preflight } from "../../../../../_lib/cors";
import { parseAndValidateBody } from "../../../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const reviewSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().max(500).optional(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.LEAVES_APPROVE);
  } catch {
    return errors.forbidden("Permission leaves.approve requise");
  }

  const { id } = await context.params;
  const validation = await parseAndValidateBody(request, reviewSchema);
  if (!validation.ok) return validation.response;

  try {
    const reviewed = await leaveService.reviewLeaveRequest(
      auth.tenant.companyId,
      auth.supabaseUid,
      id,
      validation.data.status,
      validation.data.reviewNote,
    );
    return ok({
      request: {
        id: reviewed.id,
        status: reviewed.status,
        reviewedAt: reviewed.reviewedAt
          ? reviewed.reviewedAt.toISOString()
          : null,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur révision";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    if (msg.toLowerCase().includes("traitée")) return errors.conflict(msg);
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
