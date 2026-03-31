"use server";

import { revalidatePath } from "next/cache";

import { PERMISSIONS } from "@/config/permissions";

import type { ActionResult } from "@/types";
import { createClient } from "@/lib/supabase/server";
import * as attendanceService from "@/services/attendance.service";
import type { AttendanceFilters } from "@/services/attendance.service";
import * as siteService from "@/services/site.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";
import {
  clockActionSchema,
  correctionRequestSchema,
  correctionReviewSchema,
  kioskClockSchema,
  type ClockActionInput,
  type CorrectionRequestInput,
  type CorrectionReviewInput,
  type KioskClockInput,
} from "@/validations/attendance.schema";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function clockInOutAction(
  input: ClockActionInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.ATTENDANCE_CLOCK);

    const parsed = clockActionSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const record = await attendanceService.clockAction({
      ...parsed.data,
      companyId: ctx.companyId,
    });

    revalidatePath("/dashboard/attendance");
    return { success: true, data: { id: record.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur de pointage",
    };
  }
}

export async function kioskClockAction(
  input: KioskClockInput,
): Promise<ActionResult<{ employeeName: string }>> {
  try {
    const ctx = await getContext();

    const parsed = kioskClockSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await attendanceService.kioskClock(
      ctx.companyId,
      parsed.data.pin,
      parsed.data.siteId,
      parsed.data.type,
    );

    revalidatePath("/dashboard/attendance");
    return { success: true, data: { employeeName: "" } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur kiosque",
    };
  }
}

export async function getTodayRecordAction(employeeId: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_VIEW);
  return attendanceService.getEmployeeTodayRecord(ctx.companyId, employeeId);
}

export async function getLiveAttendanceAction(siteId?: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_VIEW);
  return attendanceService.getLiveAttendance(ctx.companyId, siteId);
}

export async function getAttendanceRecordsAction(
  filters: Omit<AttendanceFilters, "companyId"> = {},
) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_VIEW);
  return attendanceService.getAttendanceRecords({
    companyId: ctx.companyId,
    ...filters,
  });
}

export async function getRecordHistoryAction(employeeId: string) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_VIEW);
  return attendanceService.getRecordHistory(ctx.companyId, employeeId);
}

export async function requestCorrectionAction(
  input: CorrectionRequestInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.ATTENDANCE_CORRECT);

    const parsed = correctionRequestSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const correction = await attendanceService.requestCorrection(
      ctx.companyId,
      ctx.userId,
      parsed.data,
    );

    revalidatePath("/dashboard/attendance");
    return { success: true, data: { id: correction.id } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function reviewCorrectionAction(
  input: CorrectionReviewInput,
): Promise<ActionResult> {
  try {
    const ctx = await getContext();
    requirePermission(ctx, PERMISSIONS.ATTENDANCE_APPROVE);

    const parsed = correctionReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    await attendanceService.reviewCorrection(
      ctx.companyId,
      ctx.userId,
      parsed.data.correctionId,
      parsed.data.status,
      parsed.data.reviewNote,
    );

    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function getPendingCorrectionsAction() {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.ATTENDANCE_APPROVE);
  return attendanceService.getPendingCorrections(ctx.companyId);
}

export async function getSitesForFilterAction() {
  const ctx = await getContext();
  return siteService.getSites(ctx.companyId);
}
