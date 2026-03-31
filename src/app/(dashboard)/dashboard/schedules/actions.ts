"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/config/permissions";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import * as scheduleService from "@/services/schedule.service";
import * as siteService from "@/services/site.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";
import {
  createScheduleSchema,
  updateScheduleSchema,
  assignScheduleSchema,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type AssignScheduleInput,
} from "@/validations/schedule.schema";
import { prisma } from "@/lib/prisma/client";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function getSchedulesAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.SCHEDULES_VIEW);
  return scheduleService.getSchedules(ctx.companyId);
}

export async function getScheduleByIdAction(scheduleId: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.SCHEDULES_VIEW);
  return scheduleService.getScheduleById(ctx.companyId, scheduleId);
}

export async function createScheduleAction(
  input: CreateScheduleInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SCHEDULES_MANAGE);

    const parsed = createScheduleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const schedule = await scheduleService.createSchedule(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/schedules");
    return { success: true, data: { id: schedule.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function updateScheduleAction(
  input: UpdateScheduleInput,
): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SCHEDULES_MANAGE);

    const parsed = updateScheduleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await scheduleService.updateSchedule(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/schedules");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function deleteScheduleAction(scheduleId: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SCHEDULES_MANAGE);
    await scheduleService.deleteSchedule(ctx.companyId, scheduleId);
    revalidatePath("/dashboard/schedules");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function assignScheduleAction(
  input: AssignScheduleInput,
): Promise<ActionResult<{ count: number }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SCHEDULES_MANAGE);

    const parsed = assignScheduleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const assignments = await scheduleService.assignSchedule(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/schedules");
    return { success: true, data: { count: assignments.length } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function unassignScheduleAction(assignmentId: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SCHEDULES_MANAGE);
    await scheduleService.unassignSchedule(ctx.companyId, assignmentId);
    revalidatePath("/dashboard/schedules");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function getWeeklyViewAction(siteId?: string, weekStart?: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.SCHEDULES_VIEW);
  return scheduleService.getWeeklyView(ctx.companyId, siteId, weekStart);
}

export async function getTemplatesAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.SCHEDULES_VIEW);
  return scheduleService.getScheduleTemplates(ctx.companyId);
}

export async function getSitesForFilterAction() {
  const ctx = await getContext();
  return siteService.getSites(ctx.companyId);
}

export async function getEmployeesForAssignAction() {
  const ctx = await getContext();
  return prisma.employee.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    select: { id: true, firstName: true, lastName: true, position: true, site: { select: { name: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
