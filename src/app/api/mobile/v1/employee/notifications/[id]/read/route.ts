/**
 * POST /api/mobile/v1/employee/notifications/[id]/read
 *
 * Marque une notification comme lue.
 */

import {
  markAsRead,
} from "@/services/employee-notification.service";

import { errors, ok } from "../../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../../_lib/auth";
import { preflight } from "../../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return errors.badRequest("ID notification manquant");

  try {
    await markAsRead(id, auth.session.employeeId);
    return ok({ markedAsRead: true });
  } catch {
    return errors.serverError("Impossible de marquer la notification comme lue");
  }
}

export const OPTIONS = preflight;
