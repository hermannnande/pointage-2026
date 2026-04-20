/**
 * GET /api/mobile/v1/employee/notifications
 *
 * Renvoie les notifications de l'employé + le compteur non lues.
 * Réutilise `employee-notification.service.ts`.
 */

import {
  getNotificationsForEmployee,
  getUnreadCount,
} from "@/services/employee-notification.service";

import { ok } from "../../_lib/api-response";
import { requireEmployeeAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { session } = auth;
  const [items, unreadCount] = await Promise.all([
    getNotificationsForEmployee(
      session.companyId,
      session.employeeId,
      session.siteId ?? null,
    ),
    getUnreadCount(session.companyId, session.employeeId, session.siteId ?? null),
  ]);

  return ok({ items, unreadCount });
}

export const OPTIONS = preflight;
