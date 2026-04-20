/**
 * /api/mobile/v1/owner/reports/presence-summary
 *
 * GET → synthèse présence par employé sur une période.
 *
 * Query :
 *   - startDate (requis), endDate (requis)
 *   - siteId?, employeeId?
 *   - format=csv → réponse texte CSV (Content-Type: text/csv) au lieu de JSON
 *
 * Permissions :
 *   - JSON  : reports.view
 *   - CSV   : reports.export
 */

import { PERMISSIONS } from "@/config/permissions";
import * as reportService from "@/services/report.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../../_lib/api-response";
import { requireOwnerAuth } from "../../../_lib/auth";
import { CORS_HEADERS, preflight } from "../../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  if (!startDate || !endDate) {
    return errors.badRequest("Paramètres startDate et endDate requis");
  }
  const siteId = searchParams.get("siteId") || undefined;
  const employeeId = searchParams.get("employeeId") || undefined;
  const format = (searchParams.get("format") || "json").toLowerCase();

  const requiredPerm = format === "csv"
    ? PERMISSIONS.REPORTS_EXPORT
    : PERMISSIONS.REPORTS_VIEW;

  try {
    requirePermission(auth.tenant, requiredPerm);
  } catch {
    return errors.forbidden(
      format === "csv"
        ? "Permission reports.export requise"
        : "Permission reports.view requise",
    );
  }

  try {
    const summary = await reportService.getPresenceSummary({
      companyId: auth.tenant.companyId,
      siteId,
      employeeId,
      startDate,
      endDate,
    });

    if (format === "csv") {
      const headers = [
        "Nom",
        "Matricule",
        "Poste",
        "Lieu",
        "Jours présent",
        "Jours retard",
        "Jours absent",
        "Heures travaillées",
        "Heures sup.",
      ];
      const rows = reportService.presenceSummaryToCsvRows(summary);
      const csv = "\uFEFF" + reportService.formatReportAsCsv(headers, rows);
      const filename = `presence_${startDate}_${endDate}.csv`;
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
          ...CORS_HEADERS,
        },
      });
    }

    // KPI agrégés (équivalents aux Badges du web)
    const summaryStats = summary.reduce(
      (acc, e) => ({
        employees: acc.employees + 1,
        daysWorked: acc.daysWorked + e.daysPresent,
        late: acc.late + e.daysLate,
        absences: acc.absences + e.daysAbsent,
        workedMinutes: acc.workedMinutes + e.totalWorkedMin,
        overtimeMinutes: acc.overtimeMinutes + e.totalOvertimeMin,
      }),
      {
        employees: 0,
        daysWorked: 0,
        late: 0,
        absences: 0,
        workedMinutes: 0,
        overtimeMinutes: 0,
      },
    );

    return ok({
      period: { startDate, endDate },
      summary: summaryStats,
      rows: summary,
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur génération rapport",
    );
  }
}

export const OPTIONS = preflight;
