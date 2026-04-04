"use server";

import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma/client";
import {
  verifySessionToken,
  EMPLOYEE_COOKIE_NAME,
  type EmployeeSessionPayload,
} from "@/lib/employee-auth";
import * as attendanceService from "@/services/attendance.service";
import type { ActionResult } from "@/types";
import type { EventType, EventSource } from "@prisma/client";

export async function getEmployeeSession(): Promise<EmployeeSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(EMPLOYEE_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function employeeClockAction(input: {
  type: EventType;
  latitude?: number;
  longitude?: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getEmployeeSession();
    if (!session) return { success: false, error: "Session expirée. Reconnectez-vous." };

    const record = await attendanceService.clockAction({
      employeeId: session.employeeId,
      companyId: session.companyId,
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      source: "MOBILE_WEB" as EventSource,
    });

    return { success: true, data: { id: record.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur de pointage",
    };
  }
}

export async function getEmployeeTodayAction() {
  const session = await getEmployeeSession();
  if (!session) return null;
  return attendanceService.getEmployeeTodayRecord(session.companyId, session.employeeId);
}

export async function getEmployeeSiteScheduleAction(): Promise<{ workEndTime: string | null } | null> {
  const session = await getEmployeeSession();
  if (!session) return null;

  const employee = await prisma.employee.findFirst({
    where: { id: session.employeeId, companyId: session.companyId },
    select: { site: { select: { workEndTime: true } } },
  });

  return { workEndTime: employee?.site?.workEndTime ?? null };
}

export async function getEmployeeRecentHistoryAction() {
  const session = await getEmployeeSession();
  if (!session) return [];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  return prisma.attendanceRecord.findMany({
    where: {
      employeeId: session.employeeId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: "desc" },
    take: 7,
    select: {
      id: true,
      date: true,
      status: true,
      clockIn: true,
      clockOut: true,
      workedMinutes: true,
      isLate: true,
      lateMinutes: true,
    },
  });
}
