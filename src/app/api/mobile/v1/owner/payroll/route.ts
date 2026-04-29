/**
 * GET /api/mobile/v1/owner/payroll
 *
 * Snapshot Paie pour l'app mobile owner :
 *   - Configuration paie courante (heures, jours, devise, taux supplémentaire)
 *   - 12 dernières périodes de paie avec leur statut + résumé
 *   - Période en cours (DRAFT) si elle existe, avec tous ses entries
 *
 * Les actions modificatrices (créer période, lancer calcul, clôturer)
 * sont sur le web pour l'instant — l'app mobile peut ouvrir le navigateur
 * sur /dashboard/payroll si besoin.
 */

import { prisma } from "@/lib/prisma/client";

import { ok } from "../../_lib/api-response";
import { requireOwnerAuth } from "../../_lib/auth";
import { preflight } from "../../_lib/cors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOwnerAuth();
  if (!auth.ok) return auth.response;

  const { companyId } = auth.tenant;

  const [config, periods, employeesWithSalary] = await Promise.all([
    prisma.payrollConfig.findUnique({ where: { companyId } }),
    prisma.payrollPeriod.findMany({
      where: { companyId },
      include: {
        _count: { select: { entries: true } },
        entries: {
          select: {
            grossSalary: true,
            netSalary: true,
            deductions: true,
            bonuses: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
      take: 12,
    }),
    prisma.employee.count({
      where: {
        companyId,
        isActive: true,
        baseSalary: { not: null, gt: 0 },
      },
    }),
  ]);

  const periodsWithSummary = periods.map((p) => {
    const totalGross = p.entries.reduce((s, e) => s + e.grossSalary, 0);
    const totalNet = p.entries.reduce((s, e) => s + e.netSalary, 0);
    const totalDeductions = p.entries.reduce((s, e) => s + e.deductions, 0);
    const totalBonuses = p.entries.reduce((s, e) => s + e.bonuses, 0);
    return {
      id: p.id,
      label: p.label,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate.toISOString(),
      status: p.status,
      closedAt: p.closedAt?.toISOString() ?? null,
      entryCount: p._count.entries,
      totalGross,
      totalNet,
      totalDeductions,
      totalBonuses,
      createdAt: p.createdAt.toISOString(),
    };
  });

  return ok({
    config: config
      ? {
          workingDaysPerMonth: config.workingDaysPerMonth,
          workingHoursPerDay: config.workingHoursPerDay,
          overtimeRate: config.overtimeRate,
          lateDeductionEnabled: config.lateDeductionEnabled,
          lateThresholdMinutes: config.lateThresholdMinutes,
          currency: config.currency,
        }
      : null,
    periods: periodsWithSummary,
    stats: {
      totalPeriods: periodsWithSummary.length,
      eligibleEmployees: employeesWithSalary,
      lastPeriodNet:
        periodsWithSummary.length > 0
          ? periodsWithSummary[0].totalNet
          : 0,
    },
    webLinks: {
      payroll: "https://ocontrole.com/dashboard/payroll",
    },
  });
}

export const OPTIONS = preflight;
