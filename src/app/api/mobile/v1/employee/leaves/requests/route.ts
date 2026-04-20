/**
 * /api/mobile/v1/employee/leaves/requests
 *
 * GET  → liste des demandes de l'employé connecté (paginée + filtre status).
 * POST → crée une nouvelle demande pour l'employé connecté.
 *        L'`employeeId` du body est ignoré et remplacé par celui de la session.
 */

import { z } from "zod/v4";
import * as leaveService from "@/services/leave.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireEmployeeAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";
import { parseAndValidateBody } from "../../../_lib/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Le body côté employé n'inclut PAS l'employeeId (il vient de la session HMAC).
const employeeCreateSchema = z.object({
  leaveTypeId: z.string().min(1, "Type de congé requis"),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().min(1, "Date de fin requise"),
  reason: z.string().max(500).optional(),
});

export async function GET(request: Request) {
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const page = Math.max(1, Number(searchParams.get("page") || "1"));
  const pageSize = Math.min(
    100,
    Math.max(1, Number(searchParams.get("pageSize") || "25")),
  );

  try {
    const result = await leaveService.getLeaveRequests({
      companyId: auth.session.companyId,
      employeeId: auth.session.employeeId,
      status,
      page,
      pageSize,
    });
    return ok({
      requests: result.requests.map((r) => ({
        id: r.id,
        leaveTypeId: r.leaveTypeId,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        totalDays: r.totalDays,
        reason: r.reason,
        status: r.status,
        reviewNote: r.reviewNote,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        leaveType: {
          id: r.leaveType.id,
          name: r.leaveType.name,
          color: r.leaveType.color,
          isPaid: r.leaveType.isPaid,
        },
      })),
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
  const auth = await requireEmployeeAuth();
  if (!auth.ok) return auth.response;

  const validation = await parseAndValidateBody(request, employeeCreateSchema);
  if (!validation.ok) return validation.response;

  try {
    const created = await leaveService.createLeaveRequest(
      auth.session.companyId,
      {
        ...validation.data,
        employeeId: auth.session.employeeId,
      },
    );
    return ok(
      {
        request: {
          id: created.id,
          status: created.status,
          totalDays: created.totalDays,
          startDate: created.startDate.toISOString(),
          endDate: created.endDate.toISOString(),
        },
      },
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
