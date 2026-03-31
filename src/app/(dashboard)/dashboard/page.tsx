"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  Clock,
  FileEdit,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getDashboardStatsAction,
  getEmployeeDashboardAction,
  getMonthlyTrendAction,
  getSitesForFilterAction,
  getTenantRoleAction,
  getWeeklyTrendAction,
} from "./actions";

const ALL_SITES = "__all__";

const WEEKDAY_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTodayDescription(): string {
  const now = new Date();
  const s = now.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type DashboardStats = Awaited<ReturnType<typeof getDashboardStatsAction>>;
type WeeklyRow = Awaited<ReturnType<typeof getWeeklyTrendAction>>[number];
type MonthlyRow = Awaited<ReturnType<typeof getMonthlyTrendAction>>[number];
type SiteRow = Awaited<ReturnType<typeof getSitesForFilterAction>>[number];
type EmployeeDash = Awaited<ReturnType<typeof getEmployeeDashboardAction>>;

function AdminStatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  color: "blue" | "green" | "amber" | "red" | "purple" | "indigo" | "orange" | "slate";
}) {
  const styles: Record<
    typeof color,
    { box: string; label: string; icon: string }
  > = {
    blue: {
      box: "bg-blue-50 dark:bg-blue-950/20",
      label: "text-blue-900 dark:text-blue-100",
      icon: "text-blue-600 dark:text-blue-400",
    },
    green: {
      box: "bg-green-50 dark:bg-green-950/20",
      label: "text-green-900 dark:text-green-100",
      icon: "text-green-600 dark:text-green-400",
    },
    amber: {
      box: "bg-amber-50 dark:bg-amber-950/20",
      label: "text-amber-900 dark:text-amber-100",
      icon: "text-amber-600 dark:text-amber-400",
    },
    red: {
      box: "bg-red-50 dark:bg-red-950/20",
      label: "text-red-900 dark:text-red-100",
      icon: "text-red-600 dark:text-red-400",
    },
    purple: {
      box: "bg-purple-50 dark:bg-purple-950/20",
      label: "text-purple-900 dark:text-purple-100",
      icon: "text-purple-600 dark:text-purple-400",
    },
    indigo: {
      box: "bg-indigo-50 dark:bg-indigo-950/20",
      label: "text-indigo-900 dark:text-indigo-100",
      icon: "text-indigo-600 dark:text-indigo-400",
    },
    orange: {
      box: "bg-orange-50 dark:bg-orange-950/20",
      label: "text-orange-900 dark:text-orange-100",
      icon: "text-orange-600 dark:text-orange-400",
    },
    slate: {
      box: "bg-slate-50 dark:bg-slate-950/20",
      label: "text-slate-900 dark:text-slate-100",
      icon: "text-slate-600 dark:text-slate-400",
    },
  };
  const t = styles[color];
  return (
    <div className={`rounded-xl border p-4 ${t.box}`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${t.label}`}>{label}</p>
        <Icon className={`h-5 w-5 ${t.icon}`} />
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function DashboardSkeleton({ mode }: { mode: "admin" | "employee" }) {
  if (mode === "employee") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mx-auto h-40 max-w-md rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <Skeleton className="h-20 rounded-xl" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-xl" />
        <Skeleton className="h-[340px] rounded-xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [roleLoading, setRoleLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [siteFilter, setSiteFilter] = useState(ALL_SITES);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [weekly, setWeekly] = useState<WeeklyRow[]>([]);
  const [monthly, setMonthly] = useState<MonthlyRow[]>([]);

  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeData, setEmployeeData] = useState<EmployeeDash>(null);

  const isEmployee = userRole === "employee";

  const siteIdForAction = useMemo(
    () => (siteFilter === ALL_SITES ? undefined : siteFilter),
    [siteFilter],
  );

  const loadAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [statsRes, weeklyRes, monthlyRes] = await Promise.all([
        getDashboardStatsAction(siteIdForAction),
        getWeeklyTrendAction(siteIdForAction),
        getMonthlyTrendAction(siteIdForAction),
      ]);
      setStats(statsRes);
      setWeekly(weeklyRes);
      setMonthly(monthlyRes);
    } catch {
      toast.error("Impossible de charger le tableau de bord.");
    } finally {
      setAdminLoading(false);
    }
  }, [siteIdForAction]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { role } = await getTenantRoleAction();
        if (cancelled) return;
        setUserRole(role);
      } catch {
        if (!cancelled) toast.error("Impossible de vérifier votre rôle.");
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (roleLoading || userRole === null || !isEmployee) return;
    let cancelled = false;
    (async () => {
      setEmployeeLoading(true);
      try {
        const data = await getEmployeeDashboardAction();
        if (!cancelled) setEmployeeData(data);
      } catch {
        if (!cancelled) toast.error("Impossible de charger votre tableau de bord.");
      } finally {
        if (!cancelled) setEmployeeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleLoading, userRole, isEmployee]);

  useEffect(() => {
    if (roleLoading || userRole === null || isEmployee) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getSitesForFilterAction();
        if (!cancelled) setSites(list);
      } catch {
        if (!cancelled) toast.error("Impossible de charger les sites.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roleLoading, userRole, isEmployee]);

  useEffect(() => {
    if (roleLoading || userRole === null || isEmployee) return;
    loadAdminData();
  }, [roleLoading, userRole, isEmployee, loadAdminData]);

  const weeklyChartData = useMemo(
    () =>
      weekly.map((row, i) => ({
        day: WEEKDAY_SHORT[i] ?? row.label,
        presents: row.present,
        retards: row.late,
      })),
    [weekly],
  );

  const monthlyChartData = useMemo(
    () =>
      monthly.map((row) => ({
        date: row.date,
        taux: row.rate,
      })),
    [monthly],
  );

  const todayStatus = useMemo(() => {
    const rec = employeeData?.today;
    if (!rec?.clockIn) {
      return { text: "Non pointé" as const, sub: null as string | null };
    }
    if (!rec.clockOut) {
      return {
        text: `En service depuis ${fmtTime(rec.clockIn)}` as const,
        sub: null as string | null,
      };
    }
    return { text: "Journée terminée" as const, sub: null as string | null };
  }, [employeeData]);

  if (roleLoading) {
    return <DashboardSkeleton mode="admin" />;
  }

  if (isEmployee) {
    if (employeeLoading) {
      return <DashboardSkeleton mode="employee" />;
    }

    return (
      <>
        <PageHeader title="Mon tableau de bord" />

        {!employeeData ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center text-sm text-muted-foreground">
              Aucun profil employé actif n’est lié à votre compte. Contactez un
              administrateur.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="mx-auto max-w-lg border bg-card">
              <CardHeader className="text-center">
                <CardTitle className="text-lg">Aujourd’hui</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 pb-6">
                <div className="text-center">
                  <p className="text-2xl font-semibold">{todayStatus.text}</p>
                  {todayStatus.sub ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {todayStatus.sub}
                    </p>
                  ) : null}
                </div>
                <Button variant="default" asChild>
                  <Link href="/dashboard/attendance/clock">Mon pointage</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cette semaine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">
                      {fmtMin(employeeData.weekSummary.totalMinutes)}
                    </span>{" "}
                    cette semaine
                  </p>
                  <p className="text-muted-foreground">
                    {employeeData.weekSummary.daysWorked} jour
                    {employeeData.weekSummary.daysWorked !== 1 ? "s" : ""}{" "}
                    travaillé
                    {employeeData.weekSummary.daysWorked !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Ce mois</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">
                      {fmtMin(employeeData.monthSummary.totalMinutes)}
                    </span>{" "}
                    ce mois
                  </p>
                  <p className="text-muted-foreground">
                    {employeeData.monthSummary.daysWorked} jour
                    {employeeData.monthSummary.daysWorked !== 1 ? "s" : ""}{" "}
                    présent
                    {employeeData.monthSummary.daysWorked !== 1 ? "s" : ""}
                    {employeeData.monthSummary.daysLate > 0 && (
                      <>
                        {" "}
                        · {employeeData.monthSummary.daysLate} retard
                        {employeeData.monthSummary.daysLate !== 1 ? "s" : ""}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="flex flex-col gap-3 py-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  <span className="font-medium">
                    {employeeData.pendingLeaves}
                  </span>{" "}
                  demande
                  {employeeData.pendingLeaves !== 1 ? "s" : ""} de congé en
                  attente
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/leaves">Voir les congés</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </>
    );
  }

  const présentsToday =
    stats !== null ? stats.present + stats.completed : 0;

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description={formatTodayDescription()}
      >
        <Select
          value={siteFilter}
          onValueChange={(v) => setSiteFilter(v || ALL_SITES)}
        >
          <SelectTrigger className="w-[200px] min-w-0" size="sm">
            <SelectValue placeholder="Site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SITES}>Tous les sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {adminLoading && !stats ? (
        <DashboardSkeleton mode="admin" />
      ) : (
        <>
          <div
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${adminLoading ? "opacity-60" : ""}`}
          >
            <AdminStatCard
              label="Employés actifs"
              value={stats?.totalEmployees ?? "—"}
              icon={Users}
              color="blue"
            />
            <AdminStatCard
              label="Présents"
              value={stats != null ? présentsToday : "—"}
              icon={UserCheck}
              color="green"
            />
            <AdminStatCard
              label="En retard"
              value={stats?.late ?? "—"}
              icon={Clock}
              color="amber"
            />
            <AdminStatCard
              label="Absents"
              value={stats?.absent ?? "—"}
              icon={UserX}
              color="red"
            />
            <AdminStatCard
              label="Taux de présence"
              value={stats != null ? `${stats.attendanceRate} %` : "—"}
              icon={TrendingUp}
              color="purple"
            />
            <AdminStatCard
              label="Heures moy."
              value={stats != null ? fmtMin(stats.avgWorkedMinutes) : "—"}
              icon={Timer}
              color="indigo"
            />
            <AdminStatCard
              label="Congés en attente"
              value={stats?.pendingLeaves ?? "—"}
              icon={Calendar}
              color="orange"
            />
            <AdminStatCard
              label="Corrections en attente"
              value={stats?.pendingCorrections ?? "—"}
              icon={FileEdit}
              color="slate"
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tendance hebdomadaire</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ borderRadius: 8 }}
                        labelFormatter={(l) => String(l)}
                        formatter={(value, name) => [
                          Number(value ?? 0),
                          name === "presents" ? "Présents" : "Retards",
                        ]}
                      />
                      <Bar
                        dataKey="presents"
                        name="presents"
                        fill="#22c55e"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="retards"
                        name="Retards"
                        fill="#f59e0b"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Taux de présence mensuel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) =>
                          new Date(`${String(v)}T12:00:00`).toLocaleDateString(
                            "fr-FR",
                            { day: "numeric", month: "short" },
                          )
                        }
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(v) => `${v} %`}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: 8 }}
                        labelFormatter={(v) =>
                          new Date(`${String(v)}T12:00:00`).toLocaleDateString(
                            "fr-FR",
                            {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        }
                        formatter={(value) => [
                          `${Number(value ?? 0)} %`,
                          "Taux",
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="taux"
                        name="Taux de présence"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-3 pt-6">
                <p className="text-sm font-medium">Pointage en direct</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/attendance">Ouvrir</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-3 pt-6">
                <p className="text-sm font-medium">Rapports</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/reports">Ouvrir</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex flex-col gap-3 pt-6">
                <p className="text-sm font-medium">Congés en attente</p>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/dashboard/leaves">Ouvrir</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
