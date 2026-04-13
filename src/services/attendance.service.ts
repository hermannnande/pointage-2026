import type { AttendanceStatus, EventSource, EventType } from "@prisma/client";

import { prisma } from "@/lib/prisma/client";

function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function parseTime(timeStr: string): { h: number; m: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { h: h ?? 0, m: m ?? 0 };
}

function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60_000);
}

function distanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface ClockPayload {
  employeeId: string;
  companyId: string;
  type: EventType;
  latitude?: number;
  longitude?: number;
  source?: EventSource;
  notes?: string;
}

export async function clockAction(payload: ClockPayload) {
  const { employeeId, companyId, type, latitude, longitude, source = "WEB", notes } = payload;
  const now = new Date();
  const today = todayDate();

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, isActive: true },
    include: { site: true },
  });
  if (!employee) throw new Error("Employé introuvable ou inactif");

  const site = employee.site;

  // La localisation est obligatoire pour tout pointage hors mode kiosque.
  if (source !== "KIOSK" && (latitude == null || longitude == null)) {
    throw new Error("La localisation est obligatoire pour effectuer le pointage.");
  }

  let isGeofenceOk: boolean | null = null;
  if (site && latitude != null && longitude != null && site.latitude != null && site.longitude != null) {
    const dist = distanceMeters(latitude, longitude, site.latitude, site.longitude);
    isGeofenceOk = dist <= site.geofenceRadius;

    if (!isGeofenceOk && source !== "KIOSK") {
      const distRounded = Math.round(dist);
      throw new Error(
        `Vous êtes à ${distRounded}m du site "${site.name}" (rayon autorisé : ${site.geofenceRadius}m). Rapprochez-vous du lieu de travail pour pointer.`
      );
    }
  }

  let record = await prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
    include: { breaks: true },
  });

  if (type === "CLOCK_IN") {
    if (record?.clockIn && !record?.clockOut) throw new Error("Déjà pointé aujourd'hui");

    if (record?.clockIn && record?.clockOut) {
      const gapMinutes = Math.max(0, diffMinutes(record.clockOut, now));
      await prisma.break.create({
        data: { recordId: record.id, startTime: record.clockOut, endTime: now, durationMinutes: gapMinutes },
      });

      const allBreaks = await prisma.break.findMany({ where: { recordId: record.id } });
      const totalBreakMin = allBreaks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          clockOut: null,
          clockOutLat: null,
          clockOutLng: null,
          workedMinutes: 0,
          breakMinutes: totalBreakMin,
          overtimeMinutes: 0,
          isEarlyDeparture: false,
          earlyMinutes: 0,
          status: record.isLate ? "LATE" : "PRESENT",
        },
        include: { breaks: true },
      });
    } else {

    let isLate = false;
    let lateMinutes = 0;
    const workStart = site?.workStartTime;
    const grace = site?.graceMinutes ?? 15;
    if (workStart) {
      const { h, m } = parseTime(workStart);
      const expected = new Date(now);
      expected.setHours(h, m, 0, 0);
      const diff = diffMinutes(expected, now);
      if (diff > grace) {
        isLate = true;
        lateMinutes = diff;
      }
    }

    const workEnd = site?.workEndTime;
    let expectedMinutes = 0;
    if (workStart && workEnd) {
      const s = parseTime(workStart);
      const e = parseTime(workEnd);
      expectedMinutes = (e.h * 60 + e.m) - (s.h * 60 + s.m);
      if (expectedMinutes < 0) expectedMinutes += 24 * 60;
    }

    const status: AttendanceStatus = isLate ? "LATE" : "PRESENT";

    record = await prisma.attendanceRecord.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: {
        companyId,
        employeeId,
        siteId: site?.id ?? null,
        date: today,
        clockIn: now,
        clockInLat: latitude ?? null,
        clockInLng: longitude ?? null,
        isGeofenceOk,
        isLate,
        lateMinutes,
        expectedMinutes,
        status,
        notes,
      },
      update: {
        clockIn: now,
        clockInLat: latitude ?? null,
        clockInLng: longitude ?? null,
        isGeofenceOk,
        isLate,
        lateMinutes,
        status,
      },
      include: { breaks: true },
    });
    }
  } else if (type === "CLOCK_OUT") {
    if (!record?.clockIn) throw new Error("Pointage d'entrée manquant");
    if (record.clockOut) throw new Error("Déjà pointé sortie aujourd'hui");

    const openBreak = record.breaks.find((b) => !b.endTime);
    if (openBreak) {
      const breakDur = diffMinutes(openBreak.startTime, now);
      await prisma.break.update({
        where: { id: openBreak.id },
        data: { endTime: now, durationMinutes: Math.max(0, breakDur) },
      });
    }

    const allBreaks = await prisma.break.findMany({ where: { recordId: record.id } });
    const totalBreakMin = allBreaks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);
    const workedMin = Math.max(0, diffMinutes(record.clockIn, now) - totalBreakMin);

    let isEarlyDeparture = false;
    let earlyMinutes = 0;
    const workEnd = site?.workEndTime;
    if (workEnd) {
      const { h, m } = parseTime(workEnd);
      const expected = new Date(now);
      expected.setHours(h, m, 0, 0);
      const diff = diffMinutes(now, expected);
      if (diff > 0) {
        isEarlyDeparture = true;
        earlyMinutes = diff;
      }
    }

    const overtimeMinutes = Math.max(0, workedMin - (record.expectedMinutes || 0));

    let status: AttendanceStatus = record.status;
    if (isEarlyDeparture) status = "EARLY_DEPARTURE";
    else if (record.isLate) status = "LATE";
    else status = "PRESENT";

    record = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: now,
        clockOutLat: latitude ?? null,
        clockOutLng: longitude ?? null,
        workedMinutes: workedMin,
        breakMinutes: totalBreakMin,
        overtimeMinutes,
        isEarlyDeparture,
        earlyMinutes,
        status,
      },
      include: { breaks: true },
    });
  } else if (type === "BREAK_START") {
    if (!record?.clockIn) throw new Error("Pointage d'entrée manquant");
    if (record.clockOut) throw new Error("Journée déjà terminée");
    const openBreak = record.breaks.find((b) => !b.endTime);
    if (openBreak) throw new Error("Une pause est déjà en cours");

    await prisma.break.create({
      data: { recordId: record.id, startTime: now },
    });
  } else if (type === "BREAK_END") {
    if (!record) throw new Error("Aucun pointage aujourd'hui");
    const openBreak = record.breaks.find((b) => !b.endTime);
    if (!openBreak) throw new Error("Aucune pause en cours");

    const breakDur = diffMinutes(openBreak.startTime, now);
    await prisma.break.update({
      where: { id: openBreak.id },
      data: { endTime: now, durationMinutes: Math.max(0, breakDur) },
    });

    const allBreaks = await prisma.break.findMany({ where: { recordId: record.id } });
    const totalBreakMin = allBreaks.reduce((sum, b) => sum + (b.durationMinutes ?? 0), 0);
    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: { breakMinutes: totalBreakMin },
    });
  }

  await prisma.attendanceEvent.create({
    data: {
      recordId: record!.id,
      employeeId,
      type,
      timestamp: now,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      isGeofenceOk,
      source,
    },
  });

  return record!;
}

export async function kioskClock(
  companyId: string,
  pin: string,
  siteId: string,
  type: EventType,
) {
  const employee = await prisma.employee.findFirst({
    where: { companyId, kioskPin: pin, siteId, isActive: true },
  });
  if (!employee) throw new Error("PIN invalide ou employé non trouvé sur ce site");

  return clockAction({
    employeeId: employee.id,
    companyId,
    type,
    source: "KIOSK",
  });
}

export interface AttendanceFilters {
  companyId: string;
  siteId?: string;
  date?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export async function getAttendanceRecords(filters: AttendanceFilters) {
  const { companyId, siteId, date, status, page = 1, pageSize = 25 } = filters;

  const where: Record<string, unknown> = { companyId };
  if (siteId) where.siteId = siteId;
  if (date) where.date = new Date(date);
  if (status) where.status = status;

  const [records, total] = await Promise.all([
    prisma.attendanceRecord.findMany({
      where: where as never,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, matricule: true } },
        site: { select: { id: true, name: true } },
        breaks: true,
      },
      orderBy: [{ date: "desc" }, { clockIn: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.attendanceRecord.count({ where: where as never }),
  ]);

  return { records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getEmployeeTodayRecord(companyId: string, employeeId: string) {
  const today = todayDate();
  return prisma.attendanceRecord.findUnique({
    where: { employeeId_date: { employeeId, date: today } },
    include: { breaks: true, events: { orderBy: { timestamp: "desc" } } },
  });
}

export async function getLiveAttendance(companyId: string, siteId?: string) {
  const today = todayDate();
  const where: Record<string, unknown> = { companyId, date: today };
  if (siteId) where.siteId = siteId;

  const records = await prisma.attendanceRecord.findMany({
    where: where as never,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true, position: true, photoUrl: true } },
      site: { select: { id: true, name: true } },
      breaks: { where: { endTime: null } },
    },
    orderBy: { clockIn: "desc" },
  });

  const totalActiveEmployees = await prisma.employee.count({
    where: { companyId, isActive: true, ...(siteId ? { siteId } : {}) },
  });

  const present = records.filter((r) => r.clockIn && !r.clockOut);
  const onBreak = records.filter((r) => r.breaks.length > 0);
  const completed = records.filter((r) => r.clockOut);
  const late = records.filter((r) => r.isLate);
  const absent = totalActiveEmployees - records.length;

  return {
    records,
    stats: {
      total: totalActiveEmployees,
      present: present.length,
      onBreak: onBreak.length,
      completed: completed.length,
      late: late.length,
      absent: Math.max(0, absent),
    },
  };
}

export async function requestCorrection(
  companyId: string,
  requestedById: string,
  data: { recordId: string; fieldChanged: string; oldValue?: string; newValue: string; reason: string },
) {
  const record = await prisma.attendanceRecord.findFirst({
    where: { id: data.recordId, companyId },
  });
  if (!record) throw new Error("Pointage introuvable");

  return prisma.attendanceCorrection.create({
    data: {
      recordId: data.recordId,
      requestedById,
      fieldChanged: data.fieldChanged,
      oldValue: data.oldValue ?? null,
      newValue: data.newValue,
      reason: data.reason,
    },
  });
}

export async function reviewCorrection(
  companyId: string,
  approvedById: string,
  correctionId: string,
  status: "APPROVED" | "REJECTED",
  reviewNote?: string,
) {
  const correction = await prisma.attendanceCorrection.findFirst({
    where: { id: correctionId },
    include: { record: true },
  });
  if (!correction) throw new Error("Correction introuvable");
  if (correction.record.companyId !== companyId) throw new Error("Accès refusé");
  if (correction.status !== "PENDING") throw new Error("Correction déjà traitée");

  const updated = await prisma.attendanceCorrection.update({
    where: { id: correctionId },
    data: { status, approvedById, reviewedAt: new Date(), reviewNote: reviewNote ?? null },
  });

  if (status === "APPROVED") {
    const field = correction.fieldChanged;
    const val = correction.newValue;
    const updateData: Record<string, unknown> = {};

    if (field === "clockIn" || field === "clockOut") {
      updateData[field] = val ? new Date(val) : null;
    } else if (field === "status") {
      updateData.status = val;
    } else if (field === "notes") {
      updateData.notes = val;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.attendanceRecord.update({
        where: { id: correction.recordId },
        data: updateData,
      });
    }
  }

  return updated;
}

export async function getPendingCorrections(companyId: string) {
  return prisma.attendanceCorrection.findMany({
    where: { status: "PENDING", record: { companyId } },
    include: {
      record: {
        include: {
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecordHistory(companyId: string, employeeId: string, limit = 30) {
  return prisma.attendanceRecord.findMany({
    where: { companyId, employeeId },
    include: {
      breaks: true,
      corrections: { orderBy: { createdAt: "desc" } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
  });
}
