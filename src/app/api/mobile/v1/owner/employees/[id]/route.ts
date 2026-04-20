/**
 * /api/mobile/v1/owner/employees/[id]
 *
 * GET    → détail d'un employé (avec site et département)
 * PATCH  → met à jour un employé (réutilise `employeeService.updateEmployee`,
 *          validation `updateEmployeeSchema`). Accepte un nouveau `password`
 *          pour réinitialiser l'identifiant employé (HMAC scrypt).
 * DELETE → soft delete (isActive = false). `?permanent=true` pour supprimer
 *          définitivement (cascade).
 *
 * Sécurité :
 *   - GET    : auth Supabase + permission `employees.view`
 *   - PATCH  : auth Supabase + permission `employees.update`
 *   - DELETE : auth Supabase + permission `employees.delete`
 */

import { PERMISSIONS } from "@/config/permissions";
import * as employeeService from "@/services/employee.service";
import { requirePermission } from "@/services/tenant.service";
import { updateEmployeeSchema } from "@/validations/employee.schema";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

type EmpDetail = NonNullable<
  Awaited<ReturnType<typeof employeeService.getEmployeeById>>
>;

function serializeEmployee(e: EmpDetail) {
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

export async function GET(_request: Request, ctx: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.EMPLOYEES_VIEW);
  } catch {
    return errors.forbidden("Permission employees.view requise");
  }

  const { id } = await ctx.params;
  if (!id) return errors.badRequest("Identifiant manquant");

  const employee = await employeeService.getEmployeeById(
    auth.tenant.companyId,
    id,
  );
  if (!employee) return errors.notFound("Employé introuvable");

  return ok({ employee: serializeEmployee(employee) });
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.EMPLOYEES_UPDATE);
  } catch {
    return errors.forbidden("Permission employees.update requise");
  }

  const { id } = await ctx.params;
  if (!id) return errors.badRequest("Identifiant manquant");

  const existing = await employeeService.getEmployeeById(
    auth.tenant.companyId,
    id,
  );
  if (!existing) return errors.notFound("Employé introuvable");

  const validation = await parseAndValidateBody(request, updateEmployeeSchema);
  if (!validation.ok) return validation.response;

  const payload = { ...validation.data, id };

  try {
    await employeeService.updateEmployee(auth.tenant.companyId, payload);
    const fresh = await employeeService.getEmployeeById(
      auth.tenant.companyId,
      id,
    );
    if (!fresh) return errors.serverError("Employé introuvable après mise à jour");
    return ok({ employee: serializeEmployee(fresh) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur mise à jour employé";
    if (msg.toLowerCase().includes("déjà utilisé")) {
      return errors.conflict(msg);
    }
    return errors.serverError(msg);
  }
}

export async function DELETE(request: Request, ctx: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.EMPLOYEES_DELETE);
  } catch {
    return errors.forbidden("Permission employees.delete requise");
  }

  const { id } = await ctx.params;
  if (!id) return errors.badRequest("Identifiant manquant");

  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get("permanent") === "true";

  try {
    if (permanent) {
      await employeeService.permanentDeleteEmployee(
        auth.tenant.companyId,
        id,
      );
    } else {
      await employeeService.deleteEmployee(auth.tenant.companyId, id);
    }
    return ok({ deleted: true, id, permanent });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur suppression employé";
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    return errors.serverError(msg);
  }
}

export const OPTIONS = preflight;
