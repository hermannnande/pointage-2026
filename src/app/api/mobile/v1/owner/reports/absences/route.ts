/**
 * /api/mobile/v1/owner/reports/absences
 *
 * GET → liste des absences sur une période (status = ABSENT).
 *
 * Query :
 *   - startDate (requis), endDate (requis)
 *   - siteId?, employeeId?
 */

import { PERMISSIONS } from "@/config/permissions";
import * as reportService from "@/services/report.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.REPORTS_VIEW);
  } catch {
    return errors.forbidden("Permission reports.view requise");
  }

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) {
    return errors.badRequest("Paramètres startDate et endDate requis");
  }
  const siteId = searchParams.get("siteId") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;

  try {
    const rows = await reportService.getAbsenceReport({
      companyId: auth.tenant.companyId,
      siteId,
      employeeId,
      startDate,
      endDate,
    });
    return ok({
      period: { startDate, endDate },
      total: rows.length,
      rows: rows.map((r) => ({
        date: r.date.toISOString(),
        employee: r.employee,
        matricule: r.matricule,
        site: r.site,
      })),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur génération rapport",
    );
  }
}

export const OPTIONS = preflight;
