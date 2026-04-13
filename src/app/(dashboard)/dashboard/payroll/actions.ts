"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/config/permissions";
import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext, requirePermission } from "@/services/tenant.service";
import * as payrollService from "@/services/payroll.service";
import {
  createPeriodSchema,
  updateConfigSchema,
  updateEntrySchema,
  type CreatePeriodInput,
  type UpdateConfigInput,
  type UpdateEntryInput,
} from "@/validations/payroll.schema";
import type { PayrollStatus } from "@prisma/client";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

// ─── Config ──────────────────────────────────────────────────

export async function getPayrollConfigAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.PAYROLL_VIEW);
  return payrollService.getPayrollConfig(ctx.companyId);
}

export async function updatePayrollConfigAction(input: UpdateConfigInput): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.PAYROLL_MANAGE);
    const parsed = updateConfigSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    await payrollService.upsertPayrollConfig(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/payroll");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

// ─── Periods ─────────────────────────────────────────────────

export async function getPayrollPeriodsAction(page = 1) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.PAYROLL_VIEW);
  return payrollService.getPayrollPeriods(ctx.companyId, { page });
}

export async function getPayrollPeriodAction(periodId: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.PAYROLL_VIEW);
  return payrollService.getPayrollPeriod(ctx.companyId, periodId);
}

export async function createPayrollPeriodAction(input: CreatePeriodInput): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.PAYROLL_MANAGE);
    const parsed = createPeriodSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    const period = await payrollService.createPayrollPeriod(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/payroll");
    return { success: true, data: { id: period.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function calculatePayrollAction(periodId: string): Promise<ActionResult<{ count: number }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.PAYROLL_MANAGE);
    const result = await payrollService.calculatePayroll(ctx.companyId, periodId);
    revalidatePath("/dashboard/payroll");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function updatePeriodStatusAction(
  periodId: string,
  status: PayrollStatus,
): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.PAYROLL_MANAGE);
    await payrollService.updatePeriodStatus(ctx.companyId, periodId, status, ctx.userId);
    revalidatePath("/dashboard/payroll");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function deletePayrollPeriodAction(periodId: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.PAYROLL_MANAGE);
    await payrollService.deletePayrollPeriod(ctx.companyId, periodId);
    revalidatePath("/dashboard/payroll");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

// ─── Entries ─────────────────────────────────────────────────

export async function updatePayrollEntryAction(input: UpdateEntryInput): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.PAYROLL_MANAGE);
    const parsed = updateEntrySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };
    await payrollService.updatePayrollEntry(ctx.companyId, parsed.data.entryId, {
      bonuses: parsed.data.bonuses,
      deductions: parsed.data.deductions,
      notes: parsed.data.notes,
    });
    revalidatePath("/dashboard/payroll");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

// ─── Summary ─────────────────────────────────────────────────

export async function getPayrollSummaryAction(periodId: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.PAYROLL_VIEW);
  return payrollService.getPayrollSummary(ctx.companyId, periodId);
}
