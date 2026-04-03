import { prisma } from "@/lib/prisma/client";

function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1));
}

export async function getDashboardStats(companyId: string, siteId?: string) {
  const today = todayDate();
  const siteFilter = siteId ? { siteId } : {};

  const [
    totalEmployees,
    todayRecords,
    pendingLeaves,
    pendingCorrections,
  ] = await Promise.all([
    prisma.employee.count({
      where: { companyId, isActive: true, ...siteFilter },
    }),
    prisma.attendanceRecord.findMany({
      where: { companyId, date: today, ...siteFilter },
      select: { status: true, clockIn: true, clockOut: true, isLate: true, workedMinutes: true, breakMinutes: true },
    }),
    prisma.leaveRequest.count({
      where: { status: "PENDING", employee: { companyId, ...siteFilter } },
    }),
    prisma.attendanceCorrection.count({
      where: { status: "PENDING", record: { companyId, ...siteFilter } },
    }),
  ]);

  const present = todayRecords.filter((r) => r.clockIn && !r.clockOut).length;
  const completed = todayRecords.filter((r) => r.clockOut).length;
  const late = todayRecords.filter((r) => r.isLate).length;
  const absent = Math.max(0, totalEmployees - todayRecords.length);
  const onBreak = todayRecords.filter((r) => r.clockIn && !r.clockOut).length;
  const totalWorkedMin = todayRecords.reduce((s, r) => s + (r.workedMinutes ?? 0), 0);
  const avgWorkedMin = todayRecords.length > 0 ? Math.round(totalWorkedMin / todayRecords.length) : 0;

  return {
    totalEmployees,
    present,
    completed,
    late,
    absent,
    onBreak,
    totalWorkedMinutes: totalWorkedMin,
    avgWorkedMinutes: avgWorkedMin,
    pendingLeaves,
    pendingCorrections,
    attendanceRate: totalEmployees > 0 ? Math.round((todayRecords.length / totalEmployees) * 100) : 0,
  };
}

export async function getWeeklyTrend(companyId: string, siteId?: string) {
  const today = new Date();
  const monday = startOfWeek(today);
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const sundayEnd = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()));
  const mondayStart = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate()));
  const siteFilter = siteId ? { siteId } : {};

  const [records, totalEmp] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: { companyId, date: { gte: mondayStart, lte: sundayEnd }, ...siteFilter },
      select: { date: true, isLate: true },
    }),
    prisma.employee.count({
      where: { companyId, isActive: true, ...siteFilter },
    }),
  ]);

  const byDate = new Map<string, { present: number; late: number }>();
  for (const r of records) {
    const key = new Date(r.date).toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { present: 0, late: 0 };
    entry.present++;
    if (r.isLate) entry.late++;
    byDate.set(key, entry);
  }

  const days: { date: string; label: string; present: number; late: number; absent: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const key = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { present: 0, late: 0 };
    days.push({
      date: key,
      label: d.toLocaleDateString("fr-FR", { weekday: "short" }),
      present: entry.present,
      late: entry.late,
      absent: Math.max(0, totalEmp - entry.present),
    });
  }

  return days;
}

export async function getMonthlyTrend(companyId: string, siteId?: string) {
  const today = new Date();
  const monthStart = startOfMonth(today);
  const siteFilter = siteId ? { siteId } : {};

  const totalEmp = await prisma.employee.count({
    where: { companyId, isActive: true, ...siteFilter },
  });

  const records = await prisma.attendanceRecord.findMany({
    where: {
      companyId,
      date: { gte: monthStart },
      ...siteFilter,
    },
    select: { date: true, isLate: true },
  });

  const byDate = new Map<string, { present: number; late: number }>();
  for (const r of records) {
    const key = new Date(r.date).toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { present: 0, late: 0 };
    entry.present++;
    if (r.isLate) entry.late++;
    byDate.set(key, entry);
  }

  const days: { date: string; present: number; late: number; absent: number; rate: number }[] = [];
  const d = new Date(monthStart);
  while (d <= today) {
    const key = d.toISOString().slice(0, 10);
    const entry = byDate.get(key) ?? { present: 0, late: 0 };
    days.push({
      date: key,
      present: entry.present,
      late: entry.late,
      absent: Math.max(0, totalEmp - entry.present),
      rate: totalEmp > 0 ? Math.round((entry.present / totalEmp) * 100) : 0,
    });
    d.setDate(d.getDate() + 1);
  }

  return days;
}

export async function getEmployeeDashboard(companyId: string, employeeId: string) {
  const today = todayDate();
  const monthStart = startOfMonth(new Date());
  const weekStart = startOfWeek(new Date());

  const [todayRecord, weekRecords, monthRecords, pendingLeaves] = await Promise.all([
    prisma.attendanceRecord.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
      include: { breaks: true },
    }),
    prisma.attendanceRecord.findMany({
      where: { employeeId, date: { gte: weekStart } },
      select: { date: true, workedMinutes: true, isLate: true, status: true },
      orderBy: { date: "asc" },
    }),
    prisma.attendanceRecord.findMany({
      where: { employeeId, date: { gte: monthStart } },
      select: { date: true, workedMinutes: true, isLate: true, status: true },
    }),
    prisma.leaveRequest.count({
      where: { employeeId, status: "PENDING" },
    }),
  ]);

  const weekWorkedMin = weekRecords.reduce((s, r) => s + (r.workedMinutes ?? 0), 0);
  const monthWorkedMin = monthRecords.reduce((s, r) => s + (r.workedMinutes ?? 0), 0);
  const monthLate = monthRecords.filter((r) => r.isLate).length;
  const monthPresent = monthRecords.length;

  return {
    today: todayRecord,
    weekSummary: {
      totalMinutes: weekWorkedMin,
      daysWorked: weekRecords.length,
      records: weekRecords,
    },
    monthSummary: {
      totalMinutes: monthWorkedMin,
      daysWorked: monthPresent,
      daysLate: monthLate,
    },
    pendingLeaves,
  };
}
