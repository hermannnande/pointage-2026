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
  accuracy?: number;
  gpsTimestamp?: number;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await getEmployeeSession();
    if (!session) return { success: false, error: "Session expirée. Reconnectez-vous." };

    const sub = await prisma.subscription.findUnique({
      where: { companyId: session.companyId },
      select: { status: true, trialEndsAt: true, currentPeriodEnd: true, gracePeriodEndsAt: true },
    });
    if (sub) {
      const now = new Date();
      const isExpired =
        (sub.status === "TRIALING" && (sub.trialEndsAt ?? sub.currentPeriodEnd) <= now) ||
        sub.status === "EXPIRED" ||
        sub.status === "CANCELLED" ||
        ((sub.status === "GRACE_PERIOD" || sub.status === "PAST_DUE") && (sub.gracePeriodEndsAt ?? sub.currentPeriodEnd) <= now);
      if (isExpired) {
        return { success: false, error: "L'abonnement de votre entreprise a expiré. Contactez votre administrateur." };
      }
    } else {
      return { success: false, error: "Aucun abonnement actif pour votre entreprise." };
    }

    const record = await attendanceService.clockAction({
      employeeId: session.employeeId,
      companyId: session.companyId,
      type: input.type,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
      gpsTimestamp: input.gpsTimestamp,
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

export async function checkEmployeeCompanySubscriptionAction(): Promise<{
  isAccessible: boolean;
  status: string;
  message: string;
} | null> {
  const session = await getEmployeeSession();
  if (!session) return null;

  const sub = await prisma.subscription.findUnique({
    where: { companyId: session.companyId },
  });

  if (!sub) {
    return { isAccessible: false, status: "EXPIRED", message: "L'abonnement de votre entreprise a expiré. Contactez votre administrateur." };
  }

  const now = new Date();

  if (sub.status === "TRIALING") {
    const trialEnd = sub.trialEndsAt ?? sub.currentPeriodEnd;
    const remaining = Math.ceil((trialEnd.getTime() - now.getTime()) / 86_400_000);
    if (remaining <= 0) {
      return { isAccessible: false, status: "EXPIRED", message: "La période d'essai de votre entreprise a expiré. Contactez votre administrateur." };
    }
    return { isAccessible: true, status: "TRIALING", message: "" };
  }

  if (sub.status === "ACTIVE") {
    return { isAccessible: true, status: "ACTIVE", message: "" };
  }

  if (sub.status === "GRACE_PERIOD" || sub.status === "PAST_DUE") {
    const graceEnd = sub.gracePeriodEndsAt ?? sub.currentPeriodEnd;
    const remaining = Math.ceil((graceEnd.getTime() - now.getTime()) / 86_400_000);
    if (remaining <= 0) {
      return { isAccessible: false, status: "EXPIRED", message: "L'abonnement de votre entreprise a expiré. Contactez votre administrateur." };
    }
    return { isAccessible: true, status: sub.status, message: "" };
  }

  return { isAccessible: false, status: sub.status, message: "L'abonnement de votre entreprise est inactif. Contactez votre administrateur." };
}
