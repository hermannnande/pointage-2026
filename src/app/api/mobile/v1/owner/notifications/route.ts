/**
 * /api/mobile/v1/owner/notifications
 *
 * GET  → liste des notifications envoyées par l'entreprise (50 dernières).
 * POST → envoie une nouvelle notification (ALL / SITE / INDIVIDUAL).
 *
 * Sécurité : auth Supabase ; pas de permission RBAC dédiée côté web,
 * on impose un rôle owner / admin / manager / hr (via tenant.role).
 */

import { z } from "zod/v4";
import * as notificationService from "@/services/employee-notification.service";

import { errors, ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import { parseAndValidateBody } from "../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sendSchema = z.object({
  title: z.string().min(2, "Minimum 2 caractères").max(100),
  message: z.string().min(2, "Message requis").max(2000),
  priority: z.enum(["LOW", "NORMAL", "URGENT"]).default("NORMAL"),
  target: z.enum(["ALL", "SITE", "INDIVIDUAL"]),
  employeeId: z.string().optional(),
  siteId: z.string().optional(),
});

const ALLOWED_ROLES = new Set(["owner", "admin", "manager", "hr"]);

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  if (!ALLOWED_ROLES.has(auth.tenant.role)) {
    return errors.forbidden("Rôle insuffisant");
  }

  try {
    const items = await notificationService.getSentNotifications(
      auth.tenant.companyId,
    );
    return ok({
      items: items.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        priority: n.priority,
        target: n.target,
        employeeName: n.employeeName,
        siteName: n.siteName,
        readCount: n.readCount,
        createdAt: n.createdAt.toISOString(),
        expiresAt: n.expiresAt.toISOString(),
        isExpired: n.isExpired,
      })),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur chargement",
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  if (!ALLOWED_ROLES.has(auth.tenant.role)) {
    return errors.forbidden("Rôle insuffisant pour envoyer des notifications");
  }

  const validation = await parseAndValidateBody(request, sendSchema);
  if (!validation.ok) return validation.response;

  const data = validation.data;

  if (data.target === "INDIVIDUAL" && !data.employeeId) {
    return errors.badRequest("employeeId requis pour la cible INDIVIDUAL");
  }
  if (data.target === "SITE" && !data.siteId) {
    return errors.badRequest("siteId requis pour la cible SITE");
  }

  try {
    const created = await notificationService.sendNotification({
      companyId: auth.tenant.companyId,
      sentById: auth.supabaseUid,
      title: data.title,
      message: data.message,
      priority: data.priority,
      target: data.target,
      employeeId: data.employeeId,
      siteId: data.siteId,
    });
    return ok(
      {
        notification: {
          id: created.id,
          createdAt: created.createdAt.toISOString(),
          expiresAt: created.expiresAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur d'envoi",
    );
  }
}

export const OPTIONS = preflight;
