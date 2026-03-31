import type { ContractType } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "@/validations/employee.schema";

export interface EmployeeFilters {
  search?: string;
  siteId?: string;
  departmentId?: string;
  isActive?: boolean;
  contractType?: string;
  page?: number;
  pageSize?: number;
}

export async function getEmployees(companyId: string, filters: EmployeeFilters = {}) {
  const {
    search,
    siteId,
    departmentId,
    isActive,
    contractType,
    page = 1,
    pageSize = 25,
  } = filters;

  const where: Record<string, unknown> = { companyId };
  if (siteId) where.siteId = siteId;
  if (departmentId) where.departmentId = departmentId;
  if (isActive !== undefined) where.isActive = isActive;
  if (contractType) where.contractType = contractType;
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { matricule: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where: where as never,
      include: {
        site: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.employee.count({ where: where as never }),
  ]);

  return { employees, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getEmployeeById(companyId: string, employeeId: string) {
  return prisma.employee.findFirst({
    where: { id: employeeId, companyId },
    include: {
      site: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
    },
  });
}

export async function createEmployee(companyId: string, data: CreateEmployeeInput) {
  return prisma.employee.create({
    data: {
      companyId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone || null,
      matricule: data.matricule || null,
      position: data.position || null,
      siteId: data.siteId || null,
      departmentId: data.departmentId || null,
      contractType: data.contractType as ContractType,
      hireDate: data.hireDate ? new Date(data.hireDate) : null,
    },
  });
}

export async function updateEmployee(companyId: string, data: UpdateEmployeeInput) {
  const { id, ...rest } = data;
  const updateData: Record<string, unknown> = {};

  if (rest.firstName !== undefined) updateData.firstName = rest.firstName;
  if (rest.lastName !== undefined) updateData.lastName = rest.lastName;
  if (rest.email !== undefined) updateData.email = rest.email || null;
  if (rest.phone !== undefined) updateData.phone = rest.phone || null;
  if (rest.matricule !== undefined) updateData.matricule = rest.matricule || null;
  if (rest.position !== undefined) updateData.position = rest.position || null;
  if (rest.siteId !== undefined) updateData.siteId = rest.siteId || null;
  if (rest.departmentId !== undefined) updateData.departmentId = rest.departmentId || null;
  if (rest.contractType !== undefined) updateData.contractType = rest.contractType;
  if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
  if (rest.hireDate !== undefined) updateData.hireDate = rest.hireDate ? new Date(rest.hireDate) : null;

  return prisma.employee.update({ where: { id }, data: updateData });
}

export async function deleteEmployee(companyId: string, employeeId: string) {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
  });
  if (!emp) throw new Error("Employé introuvable");

  return prisma.employee.update({
    where: { id: employeeId },
    data: { isActive: false },
  });
}

export async function getActiveEmployeeCount(companyId: string): Promise<number> {
  return prisma.employee.count({ where: { companyId, isActive: true } });
}

export async function importEmployees(
  companyId: string,
  rows: { firstName: string; lastName: string; email?: string; phone?: string; matricule?: string; position?: string; contractType?: string }[],
) {
  const results = { success: 0, errors: [] as { row: number; message: string }[] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await prisma.employee.create({
        data: {
          companyId,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email || null,
          phone: row.phone || null,
          matricule: row.matricule || null,
          position: row.position || null,
          contractType: (row.contractType as ContractType) || "CDI",
        },
      });
      results.success++;
    } catch (err) {
      results.errors.push({
        row: i + 1,
        message: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }

  return results;
}
