/**
 * /api/mobile/v1/owner/notifications/[id]
 *
 * DELETE → supprime une notification envoyée par l'entreprise.
 */

import * as notificationService from "@/services/employee-notification.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED_ROLES = new Set(["owner", "admin", "manager", "hr"]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  if (!ALLOWED_ROLES.has(auth.tenant.role)) {
    return errors.forbidden("Rôle insuffisant");
  }

  const { id } = await context.params;

  try {
    const result = await notificationService.deleteNotification(
      id,
      auth.tenant.companyId,
    );
    if (result.count === 0) {
      return errors.notFound("Notification introuvable");
    }
    return ok({ deleted: true });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur suppression",
    );
  }
}

export const OPTIONS = preflight;
