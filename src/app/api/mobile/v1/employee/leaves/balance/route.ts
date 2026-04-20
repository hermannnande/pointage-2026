/**
 * /api/mobile/v1/employee/leaves/balance
 *
 * GET → solde de congés de l'employé connecté pour l'année civile en cours.
 */

import * as leaveService from "@/services/leave.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  try {
    const balance = await leaveService.getEmployeeLeaveBalance(
      auth.session.companyId,
      auth.session.employeeId,
    );
    return ok({
      year: new Date().getFullYear(),
      balance: balance.map((b) => ({
        leaveType: {
          id: b.leaveType.id,
          name: b.leaveType.name,
          color: b.leaveType.color,
          isPaid: b.leaveType.isPaid,
        },
        allowed: b.allowed,
        used: b.used,
        remaining: b.remaining,
      })),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur calcul solde",
    );
  }
}

export const OPTIONS = preflight;
