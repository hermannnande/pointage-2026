/**
 * /api/mobile/v1/owner/leaves/requests/pending
 *
 * GET → liste des demandes en attente (status = PENDING), triées
 *       par date de création asc (les plus anciennes en premier).
 */

import { PERMISSIONS } from "@/config/permissions";
import * as leaveService from "@/services/leave.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../../_lib/api-response";
import { requireOwnerAuth } from "../../../../_lib/auth";
import { preflight } from "../../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.LEAVES_APPROVE);
  } catch {
    return errors.forbidden("Permission leaves.approve requise");
  }

  try {
    const requests = await leaveService.getPendingLeaveRequests(
      auth.tenant.companyId,
    );
    return ok({
      requests: requests.map((r) => ({
        id: r.id,
        employeeId: r.employeeId,
        leaveTypeId: r.leaveTypeId,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        totalDays: r.totalDays,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        employee: {
          id: r.employee.id,
          firstName: r.employee.firstName,
          lastName: r.employee.lastName,
          siteName: r.employee.site?.name ?? null,
        },
        leaveType: {
          id: r.leaveType.id,
          name: r.leaveType.name,
          color: r.leaveType.color,
        },
      })),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur chargement",
    );
  }
}

export const OPTIONS = preflight;
