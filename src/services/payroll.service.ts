"use server";

import { prisma } from "@/lib/prisma/client";
import type { AbsencePolicy, SalaryType, PayrollStatus } from "@prisma/client";

// ─── Config ──────────────────────────────────────────────────

export async function getPayrollConfig(companyId: string) {
  return prisma.payrollConfig.findUnique({ where: { companyId } });
}

export async function upsertPayrollConfig(
  companyId: string,
  data: {
    workingDaysPerMonth?: number;
    workingHoursPerDay?: number;
    overtimeRate?: number;
    lateDeductionEnabled?: boolean;
    lateThresholdMinutes?: number;
    currency?: string;
  },
) {
  return prisma.payrollConfig.upsert({
    where: { companyId },
    create: { companyId, ...data },
    update: data,
  });
}

// ─── Periods ─────────────────────────────────────────────────

export async function getPayrollPeriods(
  companyId: string,
  opts: { page?: number; pageSize?: number } = {},
) {
  const { page = 1, pageSize = 12 } = opts;

  const [periods, total] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where: { companyId },
      include: { _count: { select: { entries: true } } },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.payrollPeriod.count({ where: { companyId } }),
  ]);

  return { periods, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getPayrollPeriod(companyId: string, periodId: string) {
  return prisma.payrollPeriod.findFirst({
    where: { id: periodId, companyId },
    include: {
      entries: {
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              matricule: true,
              position: true,
              site: { select: { name: true } },
            },
          },
        },
        orderBy: { employee: { lastName: "asc" } },
      },
    },
  });
}

export async function createPayrollPeriod(
  companyId: string,
  data: { label: string; startDate: string; endDate: string },
) {
  return prisma.payrollPeriod.create({
    data: {
      companyId,
      label: data.label,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      status: "DRAFT",
    },
  });
}

export async function updatePeriodStatus(
  companyId: string,
  periodId: string,
  status: PayrollStatus,
  closedById?: string,
) {
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, companyId },
  });
  if (!period) throw new Error("Période introuvable");

  const updateData: Record<string, unknown> = { status };
  if (status === "CLOSED") {
    updateData.closedAt = new Date();
    if (closedById) updateData.closedById = closedById;
  }

  return prisma.payrollPeriod.update({ where: { id: periodId }, data: updateData });
}

export async function deletePayrollPeriod(companyId: string, periodId: string) {
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, companyId },
  });
  if (!period) throw new Error("Période introuvable");
  if (period.status === "CLOSED") throw new Error("Impossible de supprimer une période clôturée");

  return prisma.payrollPeriod.delete({ where: { id: periodId } });
}

// ─── Calculation Engine ──────────────────────────────────────

interface EmployeeAttendanceSummary {
  employeeId: string;
  baseSalary: number;
  salaryType: SalaryType;
  absencePolicy: AbsencePolicy;
  daysPresent: number;
  daysAbsent: number;
  daysOnLeave: number;
  daysLate: number;
  totalLateMinutes: number;
  overtimeMinutes: number;
}

async function buildAttendanceSummaries(
  companyId: string,
  startDate: Date,
  endDate: Date,
): Promise<EmployeeAttendanceSummary[]> {
  const employees = await prisma.employee.findMany({
    where: { companyId, isActive: true },
    select: {
      id: true,
      baseSalary: true,
      salaryType: true,
      absencePolicy: true,
    },
  });

  const records = await prisma.attendanceRecord.findMany({
    where: {
      companyId,
      date: { gte: startDate, lte: endDate },
      employeeId: { in: employees.map((e) => e.id) },
    },
    select: {
      employeeId: true,
      status: true,
      isLate: true,
      lateMinutes: true,
      overtimeMinutes: true,
    },
  });

  const grouped = new Map<string, typeof records>();
  for (const r of records) {
    const arr = grouped.get(r.employeeId) ?? [];
    arr.push(r);
    grouped.set(r.employeeId, arr);
  }

  return employees
    .filter((e) => e.baseSalary != null && e.baseSalary > 0)
    .map((e) => {
      const empRecords = grouped.get(e.id) ?? [];
      let daysPresent = 0;
      let daysAbsent = 0;
      let daysOnLeave = 0;
      let daysLate = 0;
      let totalLateMinutes = 0;
      let overtimeMinutes = 0;

      for (const r of empRecords) {
        switch (r.status) {
          case "PRESENT":
          case "LATE":
          case "EARLY_DEPARTURE":
            daysPresent++;
            break;
          case "HALF_DAY":
            daysPresent += 0.5;
            daysAbsent += 0.5;
            break;
          case "ABSENT":
            daysAbsent++;
            break;
          case "ON_LEAVE":
            daysOnLeave++;
            break;
          case "HOLIDAY":
          case "REST_DAY":
            break;
        }
        if (r.isLate) {
          daysLate++;
          totalLateMinutes += r.lateMinutes;
        }
        overtimeMinutes += r.overtimeMinutes;
      }

      return {
        employeeId: e.id,
        baseSalary: e.baseSalary!,
        salaryType: e.salaryType,
        absencePolicy: e.absencePolicy,
        daysPresent: Math.round(daysPresent),
        daysAbsent: Math.round(daysAbsent),
        daysOnLeave,
        daysLate,
        totalLateMinutes,
        overtimeMinutes,
      };
    });
}

function computeSalary(
  summary: EmployeeAttendanceSummary,
  config: {
    workingDaysPerMonth: number;
    workingHoursPerDay: number;
    overtimeRate: number;
    lateDeductionEnabled: boolean;
    lateThresholdMinutes: number;
  },
) {
  const { baseSalary, salaryType, absencePolicy, daysPresent, daysAbsent, daysOnLeave } = summary;
  const { workingDaysPerMonth, workingHoursPerDay, overtimeRate, lateDeductionEnabled, lateThresholdMinutes } = config;

  const dailyRate =
    salaryType === "MONTHLY"
      ? Math.round(baseSalary / workingDaysPerMonth)
      : salaryType === "DAILY"
        ? baseSalary
        : Math.round(baseSalary * workingHoursPerDay);

  let daysAbsentPaid = 0;
  let daysAbsentTolerated = 0;
  let daysAbsentDeducted = 0;

  switch (absencePolicy) {
    case "PAID":
      daysAbsentPaid = daysAbsent;
      break;
    case "TOLERATED":
      daysAbsentTolerated = daysAbsent;
      break;
    case "DEDUCT":
      daysAbsentDeducted = daysAbsent;
      break;
  }

  let grossSalary: number;
  if (salaryType === "MONTHLY") {
    grossSalary = baseSalary - daysAbsentDeducted * dailyRate;
  } else {
    const paidDays = daysPresent + daysAbsentPaid + daysOnLeave;
    grossSalary = paidDays * dailyRate;
  }

  let deductions = 0;
  if (lateDeductionEnabled && summary.totalLateMinutes > 0) {
    const hourlyRate = dailyRate / workingHoursPerDay;
    const deductibleMinutes = Math.max(0, summary.totalLateMinutes - lateThresholdMinutes * summary.daysLate);
    deductions += Math.round((deductibleMinutes / 60) * hourlyRate);
  }

  let bonuses = 0;
  if (summary.overtimeMinutes > 0) {
    const hourlyRate = dailyRate / workingHoursPerDay;
    bonuses += Math.round((summary.overtimeMinutes / 60) * hourlyRate * overtimeRate);
  }

  const netSalary = Math.max(0, grossSalary - deductions + bonuses);

  return {
    workingDaysExpected: workingDaysPerMonth,
    daysAbsentPaid,
    daysAbsentTolerated,
    daysAbsentDeducted,
    grossSalary: Math.max(0, grossSalary),
    deductions,
    bonuses,
    netSalary,
  };
}

// ─── Generate Entries ────────────────────────────────────────

export async function calculatePayroll(companyId: string, periodId: string) {
  const period = await prisma.payrollPeriod.findFirst({
    where: { id: periodId, companyId },
  });
  if (!period) throw new Error("Période introuvable");
  if (period.status === "CLOSED") throw new Error("Période clôturée");

  let config = await prisma.payrollConfig.findUnique({ where: { companyId } });
  if (!config) {
    config = await prisma.payrollConfig.create({ data: { companyId } });
  }

  const summaries = await buildAttendanceSummaries(companyId, period.startDate, period.endDate);

  await prisma.payrollEntry.deleteMany({ where: { periodId } });

  const entries = summaries.map((s) => {
    const calc = computeSalary(s, config);
    return {
      periodId,
      employeeId: s.employeeId,
      baseSalary: s.baseSalary,
      salaryType: s.salaryType,
      absencePolicy: s.absencePolicy,
      daysPresent: s.daysPresent,
      daysAbsent: s.daysAbsent,
      daysOnLeave: s.daysOnLeave,
      daysLate: s.daysLate,
      totalLateMinutes: s.totalLateMinutes,
      overtimeMinutes: s.overtimeMinutes,
      ...calc,
    };
  });

  if (entries.length > 0) {
    await prisma.payrollEntry.createMany({ data: entries });
  }

  await prisma.payrollPeriod.update({
    where: { id: periodId },
    data: { status: "CALCULATED" },
  });

  return { count: entries.length };
}

// ─── Entry Update ────────────────────────────────────────────

export async function updatePayrollEntry(
  companyId: string,
  entryId: string,
  data: { bonuses?: number; deductions?: number; notes?: string },
) {
  const entry = await prisma.payrollEntry.findUnique({
    where: { id: entryId },
    include: { period: { select: { companyId: true, status: true } } },
  });
  if (!entry || entry.period.companyId !== companyId) throw new Error("Entrée introuvable");
  if (entry.period.status === "CLOSED") throw new Error("Période clôturée");

  const newBonuses = data.bonuses ?? entry.bonuses;
  const newDeductions = data.deductions ?? entry.deductions;
  const netSalary = Math.max(0, entry.grossSalary - newDeductions + newBonuses);

  return prisma.payrollEntry.update({
    where: { id: entryId },
    data: {
      bonuses: newBonuses,
      deductions: newDeductions,
      netSalary,
      notes: data.notes ?? entry.notes,
    },
  });
}

// ─── Summary Stats ───────────────────────────────────────────

export async function getPayrollSummary(companyId: string, periodId: string) {
  const entries = await prisma.payrollEntry.findMany({
    where: { periodId, period: { companyId } },
    select: { grossSalary: true, netSalary: true, deductions: true, bonuses: true },
  });

  const totalGross = entries.reduce((sum, e) => sum + e.grossSalary, 0);
  const totalNet = entries.reduce((sum, e) => sum + e.netSalary, 0);
  const totalDeductions = entries.reduce((sum, e) => sum + e.deductions, 0);
  const totalBonuses = entries.reduce((sum, e) => sum + e.bonuses, 0);

  return {
    employeeCount: entries.length,
    totalGross,
    totalNet,
    totalDeductions,
    totalBonuses,
  };
}
