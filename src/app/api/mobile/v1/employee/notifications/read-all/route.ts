/**
 * /api/mobile/v1/employee/notifications/read-all
 *
 * POST → marque comme lues toutes les notifications visibles non encore lues.
 *        Renvoie le nombre de notifications nouvellement marquées.
 */

import * as notificationService from "@/services/employee-notification.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  try {
    const count = await notificationService.markAllAsRead(
      auth.session.companyId,
      auth.session.employeeId,
      auth.session.siteId ?? null,
    );
    return ok({ count });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur marquage lu",
    );
  }
}

export const OPTIONS = preflight;
