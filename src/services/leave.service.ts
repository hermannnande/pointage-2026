import { prisma } from "@/lib/prisma/client";
import type {
  CreateLeaveTypeInput,
  UpdateLeaveTypeInput,
  CreateLeaveRequestInput,
} from "@/validations/leave.schema";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function diffBusinessDays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 1);
}

export async function getLeaveTypes(companyId: string) {
  return prisma.leaveType.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function createLeaveType(companyId: string, data: CreateLeaveTypeInput) {
  const slug = slugify(data.name);
  return prisma.leaveType.create({
    data: {
      companyId,
      name: data.name,
      slug,
      color: data.color,
      defaultDays: data.defaultDays,
      isPaid: data.isPaid,
      requiresDoc: data.requiresDoc,
    },
  });
}

export async function updateLeaveType(companyId: string, data: UpdateLeaveTypeInput) {
  const { id, ...rest } = data;
  const existing = await prisma.leaveType.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Type de congé introuvable");

  const updateData: Record<string, unknown> = {};
  if (rest.name !== undefined) {
    updateData.name = rest.name;
    updateData.slug = slugify(rest.name);
  }
  if (rest.color !== undefined) updateData.color = rest.color;
  if (rest.defaultDays !== undefined) updateData.defaultDays = rest.defaultDays;
  if (rest.isPaid !== undefined) updateData.isPaid = rest.isPaid;
  if (rest.requiresDoc !== undefined) updateData.requiresDoc = rest.requiresDoc;
  if (rest.isActive !== undefined) updateData.isActive = rest.isActive;

  return prisma.leaveType.update({ where: { id }, data: updateData });
}

export async function deleteLeaveType(companyId: string, leaveTypeId: string) {
  const lt = await prisma.leaveType.findFirst({
    where: { id: leaveTypeId, companyId },
    include: { _count: { select: { requests: true } } },
  });
  if (!lt) throw new Error("Type de congé introuvable");
  if (lt._count.requests > 0) {
    throw new Error("Impossible de supprimer un type utilisé par des demandes existantes. Désactivez-le plutôt.");
  }
  return prisma.leaveType.delete({ where: { id: leaveTypeId } });
}

export interface LeaveRequestFilters {
  companyId: string;
  employeeId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function getLeaveRequests(filters: LeaveRequestFilters) {
  const { companyId, employeeId, status, page = 1, pageSize = 25 } = filters;

  const where: Record<string, unknown> = { employee: { companyId } };
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: where as never,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, site: { select: { name: true } } } },
        leaveType: { select: { id: true, name: true, color: true, isPaid: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leaveRequest.count({ where: where as never }),
  ]);

  return { requests, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getPendingLeaveRequests(companyId: string) {
  return prisma.leaveRequest.findMany({
    where: { status: "PENDING", employee: { companyId } },
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, site: { select: { name: true } } } },
      leaveType: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createLeaveRequest(companyId: string, data: CreateLeaveRequestInput) {
  const employee = await prisma.employee.findFirst({
    where: { id: data.employeeId, companyId, isActive: true },
  });
  if (!employee) throw new Error("Employé introuvable ou inactif");

  const leaveType = await prisma.leaveType.findFirst({
    where: { id: data.leaveTypeId, companyId, isActive: true },
  });
  if (!leaveType) throw new Error("Type de congé introuvable ou inactif");

  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);
  if (endDate < startDate) throw new Error("La date de fin doit être après la date de début");

  const totalDays = diffBusinessDays(startDate, endDate);

  const overlap = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: data.employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } },
      ],
    },
  });
  if (overlap) throw new Error("Une demande de congé existe déjà pour cette période");

  return prisma.leaveRequest.create({
    data: {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      startDate,
      endDate,
      totalDays,
      reason: data.reason ?? null,
    },
  });
}

export async function reviewLeaveRequest(
  companyId: string,
  reviewerId: string,
  requestId: string,
  status: "APPROVED" | "REJECTED",
  reviewNote?: string,
) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id: requestId },
    include: { employee: { select: { companyId: true } } },
  });
  if (!request || request.employee.companyId !== companyId) {
    throw new Error("Demande introuvable");
  }
  if (request.status !== "PENDING") throw new Error("Demande déjà traitée");

  return prisma.leaveRequest.update({
    where: { id: requestId },
    data: {
      status,
      approvedById: reviewerId,
      reviewedAt: new Date(),
      reviewNote: reviewNote ?? null,
    },
  });
}

export async function cancelLeaveRequest(companyId: string, requestId: string) {
  const request = await prisma.leaveRequest.findFirst({
    where: { id: requestId },
    include: { employee: { select: { companyId: true } } },
  });
  if (!request || request.employee.companyId !== companyId) {
    throw new Error("Demande introuvable");
  }
  if (request.status !== "PENDING") throw new Error("Seules les demandes en attente peuvent être annulées");

  return prisma.leaveRequest.update({
    where: { id: requestId },
    data: { status: "CANCELLED" },
  });
}

export async function getEmployeeLeaveBalance(companyId: string, employeeId: string) {
  const leaveTypes = await prisma.leaveType.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });

  const usedByType = await prisma.leaveRequest.groupBy({
    by: ["leaveTypeId"],
    where: {
      employeeId,
      status: { in: ["APPROVED", "PENDING"] },
      startDate: {
        gte: new Date(new Date().getFullYear(), 0, 1),
      },
    },
    _sum: { totalDays: true },
  });

  const usedMap = new Map(usedByType.map((u) => [u.leaveTypeId, u._sum.totalDays ?? 0]));

  return leaveTypes.map((lt) => ({
    leaveType: lt,
    allowed: lt.defaultDays,
    used: usedMap.get(lt.id) ?? 0,
    remaining: Math.max(0, lt.defaultDays - (usedMap.get(lt.id) ?? 0)),
  }));
}
