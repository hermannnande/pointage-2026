"use server";

import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/services/tenant.service";
import * as notifService from "@/services/employee-notification.service";
import * as employeeService from "@/services/employee.service";
import * as siteService from "@/services/site.service";
import type { ActionResult } from "@/types";
import type { EmployeeNotificationTarget, NotificationPriority } from "@prisma/client";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function sendNotificationAction(input: {
  title: string;
  message: string;
  target: EmployeeNotificationTarget;
  priority: NotificationPriority;
  employeeId?: string;
  siteId?: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContext();

    if (!input.title.trim() || !input.message.trim()) {
      return { success: false, error: "Le titre et le message sont requis." };
    }

    if (input.target === "INDIVIDUAL" && !input.employeeId) {
      return { success: false, error: "Veuillez sélectionner un employé." };
    }

    if (input.target === "SITE" && !input.siteId) {
      return { success: false, error: "Veuillez sélectionner un site." };
    }

    const notif = await notifService.sendNotification({
      companyId: ctx.companyId,
      sentById: ctx.userId,
      title: input.title.trim(),
      message: input.message.trim(),
      priority: input.priority,
      target: input.target,
      employeeId: input.employeeId,
      siteId: input.siteId,
    });

    return { success: true, data: { id: notif.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de l'envoi",
    };
  }
}

export async function getSentNotificationsAction() {
  const ctx = await getContext();
  return notifService.getSentNotifications(ctx.companyId);
}

export async function deleteNotificationAction(notificationId: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    await notifService.deleteNotification(notificationId, ctx.companyId);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur lors de la suppression",
    };
  }
}

export async function getEmployeesForSelectAction() {
  const ctx = await getContext();
  const result = await employeeService.getEmployees(ctx.companyId, { isActive: true, pageSize: 500 });
  return result.employees.map((e) => ({
    id: e.id,
    name: `${e.firstName} ${e.lastName}`,
    site: e.site?.name ?? null,
  }));
}

export async function getSitesForSelectAction() {
  const ctx = await getContext();
  const sites = await siteService.getSites(ctx.companyId);
  return sites.map((s) => ({ id: s.id, name: s.name }));
}
