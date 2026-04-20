/**
 * /api/mobile/v1/employee/notifications/[id]/dismiss
 *
 * POST → masque (dismiss) une notification pour l'employé connecté
 *        (la notification reste en base mais ne s'affichera plus).
 */

import * as notificationService from "@/services/employee-notification.service";

import { errors, ok } from "../../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../../_lib/auth";
import { preflight } from "../../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;

  try {
    await notificationService.dismissNotification(id, auth.session.employeeId);
    return ok({ dismissed: true });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur dismiss",
    );
  }
}

export const OPTIONS = preflight;
