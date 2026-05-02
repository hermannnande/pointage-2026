/**
 * /api/mobile/v1/owner/employees
 *
 * GET  → liste paginée des employés avec filtres (search, siteId, isActive,
 *        contractType). Renvoie aussi total et pagination.
 *
 * POST → crée un nouvel employé (réutilise `employeeService.createEmployee`,
 *        validation `createEmployeeSchema`).
 *
 * Sécurité :
 *   - GET  : auth Supabase + permission `employees.view`
 *   - POST : auth Supabase + permission `employees.create`
 */

import { PERMISSIONS } from "@/config/permissions";
import * as employeeService from "@/services/employee.service";
import { requirePermission } from "@/services/tenant.service";
import { createEmployeeSchema } from "@/validations/employee.schema";

import { errors, ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";
import { parseAndValidateBody } from "../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Emp = Awaited<
  ReturnType<typeof employeeService.getEmployees>
>["employees"][number];

function serializeEmployee(e: Emp) {
  return {
    id: e.id,
    matricule: e.matricule,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    phone: e.phone,
    photoUrl: e.photoUrl,
    position: e.position,
    contractType: e.contractType,
    salaryType: e.salaryType,
    baseSalary: e.baseSalary,
    absencePolicy: e.absencePolicy,
    hireDate: e.hireDate ? e.hireDate.toISOString() : null,
    isActive: e.isActive,
    siteId: e.siteId,
    departmentId: e.departmentId,
    site: e.site ? { id: e.site.id, name: e.site.name } : null,
    department: e.department
      ? { id: e.department.id, name: e.department.name }
      : null,
    hasPassword: Boolean(e.passwordHash),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.EMPLOYEES_VIEW);
  } catch {
    return errors.forbidden("Permission employees.view requise");
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || undefined;
  const siteId = searchParams.get("siteId") || undefined;
  const departmentId = searchParams.get("departmentId") || undefined;
  const contractType = searchParams.get("contractType") || undefined;
  const isActiveRaw = searchParams.get("isActive");
  const isActive = isActiveRaw == null
    ? undefined
    : isActiveRaw === "true";
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || "25")),
  );

  try {
    const result = await employeeService.getEmployees(
      auth.tenant.companyId,
      {
        search,
        siteId,
        departmentId,
        contractType,
        isActive,
        page,
        pageSize,
      },
    );
    return ok({
      employees: result.employees.map(serializeEmployee),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur de chargement des employés",
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.EMPLOYEES_CREATE);
  } catch {
    return errors.forbidden("Permission employees.create requise");
  }

  const validation = await parseAndValidateBody(request, createEmployeeSchema);
  if (!validation.ok) return validation.response;

  try {
    const created = await employeeService.createEmployee(
      auth.tenant.companyId,
      validation.data,
    );
    // Re-fetch with relations for serialization parity
    const fresh = await employeeService.getEmployeeById(
      auth.tenant.companyId,
      created.id,
    );
    if (!fresh) {
      return errors.serverError("Employé créé mais introuvable");
    }
    return ok({ employee: serializeEmployee(fresh) }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur création employé";
    const lower = msg.toLowerCase();
    if (lower.includes("déjà utilisé") || lower.includes("deja utilise")) {
      return errors.conflict(msg);
    }
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
