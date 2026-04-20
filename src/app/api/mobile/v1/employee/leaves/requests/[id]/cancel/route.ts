/**
 * /api/mobile/v1/employee/leaves/requests/[id]/cancel
 *
 * POST → annule une demande PENDING APPARTENANT à l'employé connecté.
 *        Vérification stricte avant d'appeler le service métier.
 */

import { prisma } from "@/lib/prisma/client";
import * as leaveService from "@/services/leave.service";

import { errors, ok } from "../../../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../../../_lib/auth";
import { preflight } from "../../../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  // Vérification : la demande appartient bien à cet employé.
  const owned = await prisma.leaveRequest.findFirst({
    where: { id, employeeId: auth.session.employeeId },
    select: { id: true },
  });
  if (!owned) {
    return errors.notFound("Demande introuvable");
  }

  try {
    const cancelled = await leaveService.cancelLeaveRequest(
      auth.session.companyId,
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
