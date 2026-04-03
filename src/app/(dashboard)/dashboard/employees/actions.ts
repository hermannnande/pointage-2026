"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/config/permissions";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import * as employeeService from "@/services/employee.service";
import type { EmployeeFilters } from "@/services/employee.service";
import * as siteService from "@/services/site.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";
import {
  createEmployeeSchema,
  type CreateEmployeeInput,
  updateEmployeeSchema,
  type UpdateEmployeeInput,
} from "@/validations/employee.schema";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function getEmployeesAction(filters: EmployeeFilters = {}) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.EMPLOYEES_VIEW);
  return employeeService.getEmployees(ctx.companyId, filters);
}

export async function getEmployeeAction(employeeId: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.EMPLOYEES_VIEW);
  return employeeService.getEmployeeById(ctx.companyId, employeeId);
}

export async function getSitesForSelectAction() {
  const ctx = await getContext();
  return siteService.getSites(ctx.companyId);
}

export async function createEmployeeAction(
  input: CreateEmployeeInput,
): Promise<ActionResult<{ id: string; matricule: string; siteCode: string | null }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.EMPLOYEES_CREATE);

    const parsed = createEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const employee = await employeeService.createEmployee(ctx.companyId, parsed.data);

    let siteCode: string | null = null;
    if (employee.siteId) {
      const site = await siteService.getSiteById(ctx.companyId, employee.siteId);
      siteCode = site?.code ?? null;
    }

    revalidatePath("/dashboard/employees");
    return {
      success: true,
      data: {
        id: employee.id,
        matricule: employee.matricule || "",
        siteCode,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function updateEmployeeAction(
  input: UpdateEmployeeInput,
): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.EMPLOYEES_UPDATE);

    const parsed = updateEmployeeSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await employeeService.updateEmployee(ctx.companyId, parsed.data);
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function deleteEmployeeAction(employeeId: string): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.EMPLOYEES_DELETE);
    await employeeService.deleteEmployee(ctx.companyId, employeeId);
    revalidatePath("/dashboard/employees");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}

export async function importEmployeesAction(
  rows: { firstName: string; lastName: string; email?: string; phone?: string; matricule?: string; position?: string; contractType?: string }[],
): Promise<ActionResult<{ success: number; errors: { row: number; message: string }[] }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.EMPLOYEES_IMPORT);

    const results = await employeeService.importEmployees(ctx.companyId, rows);
    revalidatePath("/dashboard/employees");
    return { success: true, data: results };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Erreur" };
  }
}
