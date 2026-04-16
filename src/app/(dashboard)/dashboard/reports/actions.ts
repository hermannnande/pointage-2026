"use server";

import { PERMISSIONS } from "@/config/permissions";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import * as reportService from "@/services/report.service";
import * as siteService from "@/services/site.service";
import { getTenantContext, requirePermission } from "@/services/tenant.service";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function getPresenceSummaryAction(filters: {
  siteId?: string;
  employeeId?: string;
  startDate: string;
  endDate: string;
}) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.REPORTS_VIEW);
  return reportService.getPresenceSummary({
    companyId: ctx.companyId,
    ...filters,
  });
}

export async function getLateReportAction(filters: {
  siteId?: string;
  startDate: string;
  endDate: string;
}) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.REPORTS_VIEW);
  return reportService.getLateReport({
    companyId: ctx.companyId,
    ...filters,
  });
}

export async function getAbsenceReportAction(filters: {
  siteId?: string;
  startDate: string;
  endDate: string;
}) {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.REPORTS_VIEW);
  return reportService.getAbsenceReport({
    companyId: ctx.companyId,
    ...filters,
  });
}

export async function exportPresenceCsvAction(filters: {
  siteId?: string;
  employeeId?: string;
  startDate: string;
  endDate: string;
}): Promise<string> {
  const ctx = await getContext();
  requirePermission(ctx, PERMISSIONS.REPORTS_EXPORT);
  const data = await reportService.getPresenceSummary({
    companyId: ctx.companyId,
    ...filters,
  });
  const rows = reportService.presenceSummaryToCsvRows(data);
  const headers = ["Nom", "Matricule", "Poste", "Lieu", "Jours présent", "Jours retard", "Jours absent", "Heures travaillées", "Heures sup."];
  return reportService.formatReportAsCsv(headers, rows);
}

export async function getSitesForFilterAction() {
  const ctx = await getContext();
  return siteService.getSites(ctx.companyId);
}

export async function getEmployeesForFilterAction() {
  const ctx = await getContext();
  return prisma.employee.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
}
