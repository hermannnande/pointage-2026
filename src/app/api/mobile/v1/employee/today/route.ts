/**
 * GET /api/mobile/v1/employee/today
 *
 * Renvoie l'enregistrement de pointage du jour pour l'employé courant
 * (ou null si aucun pointage aujourd'hui).
 */

import * as attendanceService from "@/services/attendance.service";

import { ok } from "../../_lib/api-response";
import { requireEmployeeAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { session } = auth;
  const record = await attendanceService.getEmployeeTodayRecord(
    session.companyId,
    session.employeeId,
  );

  return ok({ record });
}

export const OPTIONS = preflight;
