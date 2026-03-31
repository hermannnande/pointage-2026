import { prisma } from "@/lib/prisma/client";

export interface ReportFilters {
  companyId: string;
  siteId?: string;
  employeeId?: string;
  startDate: string;
  endDate: string;
}

export async function getAttendanceReport(filters: ReportFilters) {
  const { companyId, siteId, employeeId, startDate, endDate } = filters;

  const where: Record<string, unknown> = {
    companyId,
    date: { gte: new Date(startDate), lte: new Date(endDate) },
  };
  if (siteId) where.siteId = siteId;
  if (employeeId) where.employeeId = employeeId;

  const records = await prisma.attendanceRecord.findMany({
    where: where as never,
    include: {
      employee: { select: { firstName: true, lastName: true, matricule: true, position: true } },
      site: { select: { name: true } },
    },
    orderBy: [{ date: "asc" }, { employee: { lastName: "asc" } }],
  });

  return records;
}

export async function getPresenceSummary(filters: ReportFilters) {
  const records = await getAttendanceReport(filters);

  const byEmployee = new Map<string, {
    name: string;
    matricule: string | null;
    position: string | null;
    site: string | null;
    daysPresent: number;
    daysLate: number;
    daysAbsent: number;
    totalWorkedMin: number;
    totalBreakMin: number;
    totalOvertimeMin: number;
  }>();

  for (const r of records) {
    const key = r.employeeId;
    const entry = byEmployee.get(key) ?? {
      name: `${r.employee.lastName} ${r.employee.firstName}`,
      matricule: r.employee.matricule,
      position: r.employee.position,
      site: r.site?.name ?? null,
      daysPresent: 0,
      daysLate: 0,
      daysAbsent: 0,
      totalWorkedMin: 0,
      totalBreakMin: 0,
      totalOvertimeMin: 0,
    };

    if (r.status === "ABSENT") {
      entry.daysAbsent++;
    } else {
      entry.daysPresent++;
    }
    if (r.isLate) entry.daysLate++;
    entry.totalWorkedMin += r.workedMinutes ?? 0;
    entry.totalBreakMin += r.breakMinutes ?? 0;
    entry.totalOvertimeMin += r.overtimeMinutes ?? 0;

    byEmployee.set(key, entry);
  }

  return Array.from(byEmployee.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getLateReport(filters: ReportFilters) {
  const records = await getAttendanceReport(filters);
  return records
    .filter((r) => r.isLate)
    .map((r) => ({
      date: r.date,
      employee: `${r.employee.lastName} ${r.employee.firstName}`,
      matricule: r.employee.matricule,
      site: r.site?.name ?? "—",
      clockIn: r.clockIn,
      lateMinutes: r.lateMinutes,
    }));
}

export async function getAbsenceReport(filters: ReportFilters) {
  const records = await getAttendanceReport(filters);
  return records
    .filter((r) => r.status === "ABSENT")
    .map((r) => ({
      date: r.date,
      employee: `${r.employee.lastName} ${r.employee.firstName}`,
      matricule: r.employee.matricule,
      site: r.site?.name ?? "—",
    }));
}

export function formatReportAsCsv(
  headers: string[],
  rows: Record<string, unknown>[],
): string {
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(","));
  }
  return lines.join("\n");
}

function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h${min.toString().padStart(2, "0")}` : `${min}min`;
}

export function presenceSummaryToCsvRows(
  data: Awaited<ReturnType<typeof getPresenceSummary>>,
) {
  return data.map((d) => ({
    Nom: d.name,
    Matricule: d.matricule ?? "",
    Poste: d.position ?? "",
    Site: d.site ?? "",
    "Jours présent": d.daysPresent,
    "Jours retard": d.daysLate,
    "Jours absent": d.daysAbsent,
    "Heures travaillées": fmtMin(d.totalWorkedMin),
    "Heures sup.": fmtMin(d.totalOvertimeMin),
  }));
}
