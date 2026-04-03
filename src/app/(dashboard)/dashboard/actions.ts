"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma/client";
import * as dashboardService from "@/services/dashboard.service";
import * as siteService from "@/services/site.service";
import { getTenantContext } from "@/services/tenant.service";

async function getContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  const ctx = await getTenantContext(user.id);
  if (!ctx) throw new Error("Aucune entreprise");
  return ctx;
}

export async function getDashboardStatsAction(siteId?: string) {
  const ctx = await getContext();
  return dashboardService.getDashboardStats(ctx.companyId, siteId);
}

export async function getWeeklyTrendAction(siteId?: string) {
  const ctx = await getContext();
  return dashboardService.getWeeklyTrend(ctx.companyId, siteId);
}

export async function getMonthlyTrendAction(siteId?: string) {
  const ctx = await getContext();
  return dashboardService.getMonthlyTrend(ctx.companyId, siteId);
}

export async function getEmployeeDashboardAction() {
  const ctx = await getContext();
  const emp = await prisma.employee.findFirst({
    where: { companyId: ctx.companyId, userId: ctx.userId, isActive: true },
    select: { id: true },
  });
  if (!emp) return null;
  return dashboardService.getEmployeeDashboard(ctx.companyId, emp.id);
}

export async function getSitesForFilterAction() {
  const ctx = await getContext();
  return siteService.getSites(ctx.companyId);
}

export async function getTenantRoleAction() {
  const ctx = await getContext();
  return { role: ctx.role, isOwner: ctx.isOwner };
}

export async function getAdminDashboardBatchAction(siteId?: string) {
  const ctx = await getContext();
  const [stats, weekly, monthly, sites] = await Promise.all([
    dashboardService.getDashboardStats(ctx.companyId, siteId),
    dashboardService.getWeeklyTrend(ctx.companyId, siteId),
    dashboardService.getMonthlyTrend(ctx.companyId, siteId),
    siteService.getSites(ctx.companyId),
  ]);
  return { role: ctx.role, isOwner: ctx.isOwner, stats, weekly, monthly, sites };
}
