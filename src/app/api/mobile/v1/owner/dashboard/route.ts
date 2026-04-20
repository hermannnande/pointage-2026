/**
 * GET /api/mobile/v1/owner/dashboard
 *
 * Tableau de bord propriétaire / admin pour l'app mobile.
 *
 * Query params (optionnels) :
 *   - siteId : filtre toutes les statistiques sur un site
 *
 * Réponse :
 *   {
 *     kpi: { totalEmployees, present, completed, late, absent, onBreak,
 *            totalWorkedMinutes, avgWorkedMinutes,
 *            pendingLeaves, pendingCorrections, attendanceRate },
 *     weekly: [{ date, label, present, late, absent }, ...],
 *     monthly: [{ date, present, late, absent, rate }, ...],
 *     alerts: { pendingLeaves, pendingCorrections, missedClockOuts, noShowToday,
 *               anomalies, geofenceWarnings },
 *     recentEvents: [{ id, type, employeeName, employeeId, photoUrl, siteName?,
 *                      at, isLate, lateMinutes }, ...],
 *     topSites: [{ id, name, employees, presentToday, presenceRate }, ...],
 *     refreshedAt
 *   }
 *
 * Réutilise dashboardService.getDashboardStats / getWeeklyTrend / getMonthlyTrend
 * + queries dédiées pour les alertes et l'activité récente (24 dernières heures).
 *
 * Sécurité : auth Supabase + permission `attendance.view`.
 */

import { PERMISSIONS } from "@/config/permissions";
import { prisma } from "@/lib/prisma/client";
import * as dashboardService from "@/services/dashboard.service";
import { requirePermission } from "@/services/tenant.service";

import { errors, ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function todayDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function yesterdayDate(): Date {
  const t = todayDate();
  return new Date(t.getTime() - 24 * 60 * 60 * 1000);
}

export async function GET(request: Request) {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  try {
    requirePermission(auth.tenant, PERMISSIONS.ATTENDANCE_VIEW);
  } catch {
    return errors.forbidden("Permission attendance.view requise");
  }

  const { searchParams } = new URL(request.url);
  const siteId = searchParams.get("siteId") || undefined;
  const companyId = auth.tenant.companyId;
  const today = todayDate();
  const yesterday = yesterdayDate();
  const siteFilter = siteId ? { siteId } : {};

  try {
    const [kpi, weekly, monthly, missedClockOuts, anomalies, geofenceWarnings, recentEvents, topSitesRaw] =
      await Promise.all([
        dashboardService.getDashboardStats(companyId, siteId),
        dashboardService.getWeeklyTrend(companyId, siteId),
        dashboardService.getMonthlyTrend(companyId, siteId),
        // Pointages d'hier sans clockOut (oublis)
        prisma.attendanceRecord.count({
          where: {
            companyId,
            date: yesterday,
            clockIn: { not: null },
            clockOut: null,
            ...siteFilter,
          },
        }),
        // Anomalies aujourd'hui : retards
        prisma.attendanceRecord.count({
          where: {
            companyId,
            date: today,
            isLate: true,
            ...siteFilter,
          },
        }),
        // Pointages aujourd'hui hors géofence
        prisma.attendanceRecord.count({
          where: {
            companyId,
            date: today,
            isGeofenceOk: false,
            ...siteFilter,
          },
        }),
        // Activité récente : 15 derniers événements (24 dernières heures)
        prisma.attendanceEvent.findMany({
          where: {
            employee: { companyId },
            timestamp: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            ...(siteId
              ? { record: { siteId } }
              : {}),
          },
          orderBy: { timestamp: "desc" },
          take: 15,
          select: {
            id: true,
            type: true,
            timestamp: true,
            isGeofenceOk: true,
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
              },
            },
            record: {
              select: {
                isLate: true,
                lateMinutes: true,
                site: { select: { name: true } },
              },
            },
          },
        }),
        // Top sites par taux de présence aujourd'hui
        siteId
          ? Promise.resolve([])
          : prisma.site.findMany({
              where: { companyId, isActive: true },
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    employees: { where: { isActive: true } },
                  },
                },
                attendanceRecords: {
                  where: { date: today, clockIn: { not: null } },
                  select: { id: true },
                },
              },
              orderBy: { name: "asc" },
              take: 6,
            }),
      ]);

    const recentEventsOut = recentEvents.map((e) => ({
      id: e.id,
      type: e.type,
      at: e.timestamp.toISOString(),
      isLate: e.record?.isLate ?? false,
      lateMinutes: e.record?.lateMinutes ?? 0,
      isGeofenceOk: e.isGeofenceOk,
      employeeId: e.employee.id,
      employeeName: `${e.employee.firstName} ${e.employee.lastName}`.trim(),
      photoUrl: e.employee.photoUrl,
      siteName: e.record?.site?.name ?? null,
    }));

    const topSites = topSitesRaw.map((s) => {
      const total = s._count.employees;
      const presentToday = s.attendanceRecords.length;
      const rate = total > 0 ? Math.round((presentToday / total) * 100) : 0;
      return {
        id: s.id,
        name: s.name,
        employees: total,
        presentToday,
        presenceRate: rate,
      };
    });

    const alerts = {
      pendingLeaves: kpi.pendingLeaves,
      pendingCorrections: kpi.pendingCorrections,
      missedClockOuts,
      noShowToday: kpi.absent,
      anomalies,
      geofenceWarnings,
    };

    return ok({
      kpi,
      weekly,
      monthly,
      alerts,
      recentEvents: recentEventsOut,
      topSites,
      refreshedAt: new Date().toISOString(),
    });
  } catch (e) {
    return errors.serverError(
      e instanceof Error ? e.message : "Erreur de chargement du tableau de bord",
    );
  }
}

export const OPTIONS = preflight;
