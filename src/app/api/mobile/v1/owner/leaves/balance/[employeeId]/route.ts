/**
 * /api/mobile/v1/owner/leaves/balance/[employeeId]
 *
 * GET → solde de congés d'un employé pour l'année civile en cours.
 *       Renvoie une liste { leaveType, allowed, used, remaining }.
 */

import { PERMISSIONS } from "@/config/permissions";
import * as leaveService from "@/services/leave.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../../_lib/api-response";
import { requireOwnerAuth } from "../../../../_lib/auth";
import { preflight } from "../../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ employeeId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.LEAVES_VIEW);
  } catch {
    return errors.forbidden("Permission leaves.view requise");
  }

  const { employeeId } = await context.params;

  try {
    const balance = await leaveService.getEmployeeLeaveBalance(
      auth.tenant.companyId,
      employeeId,
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
