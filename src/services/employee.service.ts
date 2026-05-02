import { Prisma } from "@prisma/client";
import type { AbsencePolicy, ContractType, SalaryType } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";
import { hashPassword } from "@/lib/employee-auth";
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

export async function checkPhoneAvailability(phone: string, excludeEmployeeId?: string) {
  const normalizedPhone = phone.trim().replace(/\s+/g, "");
  const existing = await prisma.employee.findFirst({
    where: {
      phone: normalizedPhone,
      isActive: true,
      id: excludeEmployeeId ? { not: excludeEmployeeId } : undefined,
    },
    include: {
      company: { select: { name: true } },
    },
  });
  return existing;
}

/**
 * Vérifie si un matricule est déjà utilisé par un employé ACTIF de la même
 * entreprise. Renvoie l'employé en conflit, ou null sinon.
 */
export async function checkMatriculeAvailability(
  companyId: string,
  matricule: string,
  excludeEmployeeId?: string,
) {
  const trimmed = matricule.trim();
  if (!trimmed) return null;
  return prisma.employee.findFirst({
    where: {
      companyId,
      matricule: trimmed,
      isActive: true,
      id: excludeEmployeeId ? { not: excludeEmployeeId } : undefined,
    },
  });
}

/**
 * Génère le prochain matricule libre au format EMP-NNN dans la company.
 * Utilise le max + 1 (et non count + 1) pour éviter les collisions après
 * suppressions logiques (soft delete) ou matricules saisis manuellement.
 */
async function generateNextMatricule(companyId: string): Promise<string> {
  const all = await prisma.employee.findMany({
    where: { companyId, matricule: { startsWith: "EMP-" } },
    select: { matricule: true },
  });
  let maxNum = 0;
  for (const e of all) {
    const m = e.matricule?.match(/^EMP-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > maxNum) maxNum = n;
    }
  }
  return `EMP-${String(maxNum + 1).padStart(3, "0")}`;
}

/**
 * Recherche un employé "réactivable" : un employé soft-deleted
 * (`isActive: false`) de la même entreprise dont le téléphone ou le matricule
 * correspond aux nouvelles données. C'est ce qu'on veut récupérer plutôt que
 * de bloquer l'utilisateur sur la contrainte unique `(company_id, matricule)`.
 */
async function findReactivableEmployee(
  companyId: string,
  phone: string,
  matricule: string | null,
) {
  const or: Prisma.EmployeeWhereInput[] = [{ phone }];
  if (matricule) or.push({ matricule });
  return prisma.employee.findFirst({
    where: { companyId, isActive: false, OR: or },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createEmployee(companyId: string, data: CreateEmployeeInput) {
  const normalizedPhone = data.phone.trim().replace(/\s+/g, "");
  const requestedMatricule = data.matricule?.trim() || null;

  // 1. Bloquer si un employé ACTIF (toutes companies) utilise déjà ce téléphone.
  const phoneTaken = await checkPhoneAvailability(normalizedPhone);
  if (phoneTaken) {
    throw new Error(
      `Ce numéro de téléphone est déjà utilisé par un employé actif dans l'entreprise "${phoneTaken.company.name}". L'employé doit d'abord être supprimé de son ancienne entreprise avant de pouvoir être ajouté ici.`,
    );
  }

  // 2. Bloquer si un matricule manuel est déjà utilisé par un employé ACTIF
  //    de cette company (collision réelle, pas un simple soft-delete).
  if (requestedMatricule) {
    const matTaken = await checkMatriculeAvailability(companyId, requestedMatricule);
    if (matTaken) {
      throw new Error(
        `Le matricule "${requestedMatricule}" est déjà utilisé par ${matTaken.firstName} ${matTaken.lastName}. Choisissez un matricule différent.`,
      );
    }
  }

  // 3. Réactivation auto. Si un employé soft-deleted dans la même entreprise
  //    correspond (téléphone ou matricule), on le réactive avec les nouvelles
  //    infos. On préserve ainsi tout l'historique (pointages, paie, congés).
  const reactivable = await findReactivableEmployee(
    companyId,
    normalizedPhone,
    requestedMatricule,
  );

  const passwordHash = data.password ? hashPassword(data.password) : null;
  const sharedData = {
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email || null,
    phone: normalizedPhone,
    position: data.position || null,
    siteId: data.siteId || null,
    departmentId: data.departmentId || null,
    contractType: data.contractType as ContractType,
    hireDate: data.hireDate ? new Date(data.hireDate) : null,
    baseSalary: data.baseSalary ?? null,
    salaryType: (data.salaryType as SalaryType) ?? ("MONTHLY" as SalaryType),
    absencePolicy: (data.absencePolicy as AbsencePolicy) ?? ("DEDUCT" as AbsencePolicy),
  };

  if (reactivable) {
    return prisma.employee.update({
      where: { id: reactivable.id },
      data: {
        ...sharedData,
        matricule: requestedMatricule ?? reactivable.matricule,
        ...(passwordHash !== null ? { passwordHash } : {}),
        isActive: true,
      },
    });
  }

  // 4. Création standard. Génère un matricule auto si non fourni.
  const matricule = requestedMatricule ?? (await generateNextMatricule(companyId));

  try {
    return await prisma.employee.create({
      data: {
        companyId,
        matricule,
        passwordHash,
        ...sharedData,
      },
    });
  } catch (e) {
    // Filet de sécurité : si une race condition fait passer une contrainte
    // unique, on traduit en message clair en français au lieu de remonter
    // l'erreur Prisma brute.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined) ?? [];
      if (target.includes("matricule")) {
        throw new Error(
          `Le matricule "${matricule}" est déjà utilisé dans cette entreprise. Veuillez en saisir un autre.`,
        );
      }
      if (target.includes("phone")) {
        throw new Error(
          "Ce numéro de téléphone est déjà utilisé dans cette entreprise.",
        );
      }
    }
    throw e;
  }
}

export async function updateEmployee(companyId: string, data: UpdateEmployeeInput) {
  const { id, ...rest } = data;
  const updateData: Record<string, unknown> = {};

  if (rest.phone !== undefined && rest.phone) {
    const normalizedPhone = rest.phone.trim().replace(/\s+/g, "");
    const existing = await checkPhoneAvailability(normalizedPhone, id);
    if (existing) {
      throw new Error(
        `Ce numéro de téléphone est déjà utilisé par un employé actif dans l'entreprise "${existing.company.name}". L'employé doit d'abord être supprimé de son ancienne entreprise.`,
      );
    }
    updateData.phone = normalizedPhone;
  } else if (rest.phone !== undefined) {
    updateData.phone = rest.phone || null;
  }

  if (rest.matricule !== undefined) {
    const trimmedMat = rest.matricule?.trim() || null;
    if (trimmedMat) {
      const conflict = await checkMatriculeAvailability(companyId, trimmedMat, id);
      if (conflict) {
        throw new Error(
          `Le matricule "${trimmedMat}" est déjà utilisé par ${conflict.firstName} ${conflict.lastName}. Choisissez un matricule différent.`,
        );
      }
    }
    updateData.matricule = trimmedMat;
  }

  if (rest.firstName !== undefined) updateData.firstName = rest.firstName;
  if (rest.lastName !== undefined) updateData.lastName = rest.lastName;
  if (rest.email !== undefined) updateData.email = rest.email || null;
  if (rest.position !== undefined) updateData.position = rest.position || null;
  if (rest.siteId !== undefined) updateData.siteId = rest.siteId || null;
  if (rest.departmentId !== undefined) updateData.departmentId = rest.departmentId || null;
  if (rest.contractType !== undefined) updateData.contractType = rest.contractType;
  if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
  if (rest.hireDate !== undefined) updateData.hireDate = rest.hireDate ? new Date(rest.hireDate) : null;
  if (rest.password) updateData.passwordHash = hashPassword(rest.password);
  if (rest.baseSalary !== undefined) updateData.baseSalary = rest.baseSalary ?? null;
  if (rest.salaryType !== undefined) updateData.salaryType = rest.salaryType;
  if (rest.absencePolicy !== undefined) updateData.absencePolicy = rest.absencePolicy;

  try {
    return await prisma.employee.update({ where: { id }, data: updateData });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = (e.meta?.target as string[] | undefined) ?? [];
      if (target.includes("matricule")) {
        throw new Error(
          `Le matricule "${updateData.matricule}" est déjà utilisé dans cette entreprise. Veuillez en saisir un autre.`,
        );
      }
      if (target.includes("phone")) {
        throw new Error(
          "Ce numéro de téléphone est déjà utilisé dans cette entreprise.",
        );
      }
    }
    throw e;
  }
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

export async function permanentDeleteEmployee(companyId: string, employeeId: string) {
  const emp = await prisma.employee.findFirst({
    where: { id: employeeId, companyId },
  });
  if (!emp) throw new Error("Employé introuvable");

  return prisma.employee.delete({
    where: { id: employeeId },
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
      let message = err instanceof Error ? err.message : "Erreur inconnue";
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes("matricule")) {
          message = `Le matricule "${row.matricule}" est déjà utilisé dans cette entreprise.`;
        } else if (target.includes("phone")) {
          message = `Le téléphone "${row.phone}" est déjà utilisé dans cette entreprise.`;
        }
      }
      results.errors.push({ row: i + 1, message });
    }
  }

  return results;
}
