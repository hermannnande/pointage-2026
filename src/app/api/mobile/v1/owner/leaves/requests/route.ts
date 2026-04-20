/**
 * /api/mobile/v1/owner/leaves/requests
 *
 * GET  → liste paginée des demandes (filtres : employeeId, status, page, pageSize).
 * POST → crée une demande de congé (l'owner peut le faire pour n'importe quel employé).
 */

import { PERMISSIONS } from "@/config/permissions";
import * as leaveService from "@/services/leave.service";
import { requirePermission } from "@/services/tenant.service";
import { createLeaveRequestSchema } from "@/validations/leave.schema";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LeaveReq = Awaited<
  ReturnType<typeof leaveService.getLeaveRequests>
>["requests"][number];

export function serializeLeaveRequest(r: LeaveReq) {
  return {
    id: r.id,
    employeeId: r.employeeId,
    leaveTypeId: r.leaveTypeId,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    totalDays: r.totalDays,
    reason: r.reason,
    status: r.status,
    approvedById: r.approvedById,
    reviewNote: r.reviewNote,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    attachmentUrl: r.attachmentUrl,
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
      isPaid: r.leaveType.isPaid,
    },
  };
}

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.LEAVES_VIEW);
  } catch {
    return errors.forbidden("Permission leaves.view requise");
  }

  const { searchParams } = new URL(request.url);
  const employeeId = searchParams.get("employeeId") || undefined;
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || "25")),
  );

  try {
    const result = await leaveService.getLeaveRequests({
      companyId: auth.tenant.companyId,
      employeeId,
      status,
      page,
      pageSize,
    });
    return ok({
      requests: result.requests.map(serializeLeaveRequest),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur chargement demandes",
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.LEAVES_REQUEST);
  } catch {
    return errors.forbidden("Permission leaves.request requise");
  }

  const validation = await parseAndValidateBody(
    request,
    createLeaveRequestSchema,
  );
  if (!validation.ok) return validation.response;

  try {
    const created = await leaveService.createLeaveRequest(
      auth.tenant.companyId,
      validation.data,
    );
    return ok(
      { request: { id: created.id, status: created.status } },
      { status: 201 },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur création demande";
    if (msg.toLowerCase().includes("existe déjà")) return errors.conflict(msg);
    if (msg.toLowerCase().includes("introuvable")) return errors.notFound(msg);
    return errors.badRequest(msg);
  }
}

export const OPTIONS = preflight;
