/**
 * GET /api/mobile/v1/employee/history?days=7
 *
 * Renvoie l'historique récent de pointage de l'employé courant.
 * `days` : entre 1 et 31 (défaut 7).
 */

import { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma/client";

import { ok } from "../../_lib/api-response";
import { requireEmployeeAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const daysRaw = request.nextUrl.searchParams.get("days");
  let days = Number(daysRaw);
  if (!Number.isFinite(days)) days = 7;
  days = Math.max(1, Math.min(31, Math.trunc(days)));

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const { session } = auth;
  const records = await prisma.attendanceRecord.findMany({
    where: {
      employeeId: session.employeeId,
      date: { gte: fromDate },
    },
    orderBy: { date: "desc" },
    take: days,
    select: {
      id: true,
      date: true,
      status: true,
      clockIn: true,
      clockOut: true,
      workedMinutes: true,
      isLate: true,
      lateMinutes: true,
      breaks: { select: { id: true, startTime: true, endTime: true } },
    },
  });

  return ok({ records, days });
}

export const OPTIONS = preflight;
