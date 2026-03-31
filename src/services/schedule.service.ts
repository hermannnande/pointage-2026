import { prisma } from "@/lib/prisma/client";
import type {
  CreateScheduleInput,
  UpdateScheduleInput,
  AssignScheduleInput,
} from "@/validations/schedule.schema";

const DAY_LABELS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export { DAY_LABELS };

export async function getSchedules(companyId: string) {
  return prisma.schedule.findMany({
    where: { companyId },
    include: {
      shifts: { orderBy: { dayOfWeek: "asc" } },
      _count: { select: { assignments: { where: { isActive: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getScheduleById(companyId: string, scheduleId: string) {
  return prisma.schedule.findFirst({
    where: { id: scheduleId, companyId },
    include: {
      shifts: { orderBy: { dayOfWeek: "asc" } },
      assignments: {
        where: { isActive: true },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, position: true, site: { select: { id: true, name: true } } },
          },
        },
        orderBy: { startDate: "desc" },
      },
    },
  });
}

export async function createSchedule(companyId: string, data: CreateScheduleInput) {
  return prisma.schedule.create({
    data: {
      companyId,
      name: data.name,
      description: data.description ?? null,
      isTemplate: data.isTemplate,
      shifts: {
        create: data.shifts.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          breakMinutes: s.breakMinutes,
          isWorkDay: s.isWorkDay,
        })),
      },
    },
    include: { shifts: { orderBy: { dayOfWeek: "asc" } } },
  });
}

export async function updateSchedule(companyId: string, data: UpdateScheduleInput) {
  const { id, shifts, ...rest } = data;

  const existing = await prisma.schedule.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Planning introuvable");

  const updateData: Record<string, unknown> = {};
  if (rest.name !== undefined) updateData.name = rest.name;
  if (rest.description !== undefined) updateData.description = rest.description;
  if (rest.isActive !== undefined) updateData.isActive = rest.isActive;
  if (rest.isTemplate !== undefined) updateData.isTemplate = rest.isTemplate;

  if (shifts) {
    await prisma.shift.deleteMany({ where: { scheduleId: id } });
    await prisma.shift.createMany({
      data: shifts.map((s) => ({
        scheduleId: id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        breakMinutes: s.breakMinutes,
        isWorkDay: s.isWorkDay,
      })),
    });
  }

  return prisma.schedule.update({
    where: { id },
    data: updateData,
    include: { shifts: { orderBy: { dayOfWeek: "asc" } } },
  });
}

export async function deleteSchedule(companyId: string, scheduleId: string) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: scheduleId, companyId },
    include: { _count: { select: { assignments: { where: { isActive: true } } } } },
  });
  if (!schedule) throw new Error("Planning introuvable");
  if (schedule._count.assignments > 0) {
    throw new Error("Impossible de supprimer un planning avec des affectations actives");
  }
  return prisma.schedule.delete({ where: { id: scheduleId } });
}

export async function assignSchedule(companyId: string, data: AssignScheduleInput) {
  const schedule = await prisma.schedule.findFirst({
    where: { id: data.scheduleId, companyId },
  });
  if (!schedule) throw new Error("Planning introuvable");

  const employees = await prisma.employee.findMany({
    where: { id: { in: data.employeeIds }, companyId, isActive: true },
    select: { id: true },
  });
  if (employees.length === 0) throw new Error("Aucun employé valide sélectionné");

  const startDate = new Date(data.startDate);
  const endDate = data.endDate ? new Date(data.endDate) : null;

  await prisma.scheduleAssignment.updateMany({
    where: {
      employeeId: { in: employees.map((e) => e.id) },
      isActive: true,
    },
    data: { isActive: false, endDate: startDate },
  });

  const assignments = await prisma.scheduleAssignment.createManyAndReturn({
    data: employees.map((e) => ({
      scheduleId: data.scheduleId,
      employeeId: e.id,
      startDate,
      endDate,
      isActive: true,
    })),
  });

  return assignments;
}

export async function unassignSchedule(companyId: string, assignmentId: string) {
  const assignment = await prisma.scheduleAssignment.findFirst({
    where: { id: assignmentId },
    include: { schedule: { select: { companyId: true } } },
  });
  if (!assignment || assignment.schedule.companyId !== companyId) {
    throw new Error("Affectation introuvable");
  }

  return prisma.scheduleAssignment.update({
    where: { id: assignmentId },
    data: { isActive: false, endDate: new Date() },
  });
}

export async function getEmployeeSchedule(companyId: string, employeeId: string) {
  const assignment = await prisma.scheduleAssignment.findFirst({
    where: { employeeId, isActive: true, schedule: { companyId } },
    include: {
      schedule: { include: { shifts: { orderBy: { dayOfWeek: "asc" } } } },
    },
    orderBy: { startDate: "desc" },
  });
  return assignment;
}

export async function getWeeklyView(companyId: string, siteId?: string, weekStartDate?: string) {
  const start = weekStartDate ? new Date(weekStartDate) : getMonday(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  const employeeWhere: Record<string, unknown> = { companyId, isActive: true };
  if (siteId) employeeWhere.siteId = siteId;

  const employees = await prisma.employee.findMany({
    where: employeeWhere as never,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      position: true,
      site: { select: { id: true, name: true } },
      scheduleAssignments: {
        where: { isActive: true },
        include: {
          schedule: { include: { shifts: { orderBy: { dayOfWeek: "asc" } } } },
        },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const attendanceRecords = await prisma.attendanceRecord.findMany({
    where: {
      companyId,
      date: { gte: start, lte: end },
      ...(siteId ? { siteId } : {}),
    },
    select: {
      employeeId: true,
      date: true,
      status: true,
      clockIn: true,
      clockOut: true,
      workedMinutes: true,
      isLate: true,
      lateMinutes: true,
    },
  });

  const recordsByEmployee = new Map<string, typeof attendanceRecords>();
  for (const r of attendanceRecords) {
    const arr = recordsByEmployee.get(r.employeeId) ?? [];
    arr.push(r);
    recordsByEmployee.set(r.employeeId, arr);
  }

  return {
    weekStart: start.toISOString(),
    weekEnd: end.toISOString(),
    employees: employees.map((emp) => ({
      ...emp,
      schedule: emp.scheduleAssignments[0]?.schedule ?? null,
      attendance: recordsByEmployee.get(emp.id) ?? [],
    })),
  };
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getScheduleTemplates(companyId: string) {
  return prisma.schedule.findMany({
    where: { companyId, isTemplate: true, isActive: true },
    include: { shifts: { orderBy: { dayOfWeek: "asc" } } },
    orderBy: { name: "asc" },
  });
}
