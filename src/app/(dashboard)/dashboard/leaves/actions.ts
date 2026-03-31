"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/config/permissions";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import * as leaveService from "@/services/leave.service";
import type { LeaveRequestFilters } from "@/services/leave.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";
import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createLeaveRequestSchema,
  reviewLeaveRequestSchema,
  type CreateLeaveTypeInput,
  type UpdateLeaveTypeInput,
  type CreateLeaveRequestInput,
  type ReviewLeaveRequestInput,
} from "@/validations/leave.schema";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function getLeaveTypesAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.LEAVES_VIEW);
  return leaveService.getLeaveTypes(ctx.companyId);
}

export async function createLeaveTypeAction(
  input: CreateLeaveTypeInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SETTINGS_MANAGE);
    const parsed = createLeaveTypeSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const lt = await leaveService.createLeaveType(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/leaves");
    return { success: true, data: { id: lt.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function updateLeaveTypeAction(
  input: UpdateLeaveTypeInput,
): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SETTINGS_MANAGE);
    const parsed = updateLeaveTypeSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    await leaveService.updateLeaveType(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/leaves");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function deleteLeaveTypeAction(id: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.SETTINGS_MANAGE);
    await leaveService.deleteLeaveType(ctx.companyId, id);
    revalidatePath("/dashboard/leaves");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function getLeaveRequestsAction(
  filters: Omit<LeaveRequestFilters, "companyId"> = {},
) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.LEAVES_VIEW);
  return leaveService.getLeaveRequests({ companyId: ctx.companyId, ...filters });
}

export async function getPendingLeaveRequestsAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.LEAVES_APPROVE);
  return leaveService.getPendingLeaveRequests(ctx.companyId);
}

export async function createLeaveRequestAction(
  input: CreateLeaveRequestInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.LEAVES_REQUEST);
    const parsed = createLeaveRequestSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const req = await leaveService.createLeaveRequest(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/leaves");
    return { success: true, data: { id: req.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function reviewLeaveRequestAction(
  input: ReviewLeaveRequestInput,
): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.LEAVES_APPROVE);
    const parsed = reviewLeaveRequestSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    await leaveService.reviewLeaveRequest(
      ctx.companyId,
      ctx.userId,
      parsed.data.requestId,
      parsed.data.status,
      parsed.data.reviewNote,
    );
    revalidatePath("/dashboard/leaves");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function cancelLeaveRequestAction(requestId: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.LEAVES_REQUEST);
    await leaveService.cancelLeaveRequest(ctx.companyId, requestId);
    revalidatePath("/dashboard/leaves");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function getLeaveBalanceAction(employeeId: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.LEAVES_VIEW);
  return leaveService.getEmployeeLeaveBalance(ctx.companyId, employeeId);
}

export async function getEmployeesForSelectAction() {
  const ctx = await getContext();
  return prisma.employee.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}

export async function getMyEmployeeIdAction(): Promise<string | null> {
  const ctx = await getContext();
  const emp = await prisma.employee.findFirst({
    where: { companyId: ctx.companyId, userId: ctx.userId, isActive: true },
    select: { id: true },
  });
  return emp?.id ?? null;
}
