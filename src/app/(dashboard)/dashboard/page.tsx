"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Clock,
  FileEdit,
  HelpCircle,
  MapPin,
  Plus,
  Timer,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";

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
import { ModeSwitch } from "@/components/dashboard/mode-switch";
import {
  useDashboardMode,
  useTutorialState,
} from "@/hooks/use-dashboard-preferences";

const OnboardingTutorial = dynamic(
  () => import("@/components/dashboard/onboarding-tutorial").then((m) => m.OnboardingTutorial),
  { ssr: false },
);

const LazyBarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const LazyBar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const LazyLineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const LazyLine = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const LazyResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const LazyTooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const LazyXAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const LazyYAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const LazyCartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });

import {
  getAdminDashboardBatchAction,
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

/* ---------- Stat card ---------- */
function StatCard({
  label,
  subtitle,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  subtitle?: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  color: "blue" | "green" | "amber" | "red" | "purple" | "indigo" | "orange" | "slate";
}) {
  const palette: Record<typeof color, { bg: string; iconBg: string; iconFg: string }> = {
    green: {
      bg: "border-green-100 dark:border-green-900/40",
      iconBg: "bg-green-100 dark:bg-green-900/30",
      iconFg: "text-green-600 dark:text-green-400",
    },
    amber: {
      bg: "border-amber-100 dark:border-amber-900/40",
      iconBg: "bg-amber-100 dark:bg-amber-900/30",
      iconFg: "text-amber-600 dark:text-amber-400",
    },
    red: {
      bg: "border-red-100 dark:border-red-900/40",
      iconBg: "bg-red-100 dark:bg-red-900/30",
      iconFg: "text-red-600 dark:text-red-400",
    },
    blue: {
      bg: "border-blue-100 dark:border-blue-900/40",
      iconBg: "bg-blue-100 dark:bg-blue-900/30",
      iconFg: "text-blue-600 dark:text-blue-400",
    },
    purple: {
      bg: "border-purple-100 dark:border-purple-900/40",
      iconBg: "bg-purple-100 dark:bg-purple-900/30",
      iconFg: "text-purple-600 dark:text-purple-400",
    },
    indigo: {
      bg: "border-indigo-100 dark:border-indigo-900/40",
      iconBg: "bg-indigo-100 dark:bg-indigo-900/30",
      iconFg: "text-indigo-600 dark:text-indigo-400",
    },
    orange: {
      bg: "border-orange-100 dark:border-orange-900/40",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      iconFg: "text-orange-600 dark:text-orange-400",
    },
    slate: {
      bg: "border-slate-100 dark:border-slate-900/40",
      iconBg: "bg-slate-100 dark:bg-slate-900/30",
      iconFg: "text-slate-600 dark:text-slate-400",
    },
  };
  const p = palette[color];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border bg-white p-5 transition-shadow hover:shadow-md dark:bg-card ${p.bg}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-muted-foreground/80">{subtitle}</p>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${p.iconBg}`}
        >
          <Icon className={`h-5 w-5 ${p.iconFg}`} />
        </div>
      </div>
    </div>
  );
}

/* ---------- Quick action card ---------- */
function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  color,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  href: string;
  color: string;
}) {
  return (
    <Link href={href} className="group">
      <div className="flex items-start gap-4 rounded-2xl border bg-white p-4 transition-all hover:border-primary/30 hover:shadow-md dark:bg-card">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
    </Link>
  );
}

/* ---------- Skeletons ---------- */
function DashboardSkeleton({ mode }: { mode: "admin" | "employee" }) {
  if (mode === "employee") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mx-auto h-40 max-w-md rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-2xl" />
        <Skeleton className="h-[340px] rounded-2xl" />
      </div>
    </div>
  );
}

/* ============================================================
   MAIN DASHBOARD
   ============================================================ */
export default function DashboardPage() {
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "true";

  const { mode, setMode, loaded: modeLoaded } = useDashboardMode();
  const {
    seen: tutorialSeen,
    loaded: tutorialLoaded,
    markSeen: markTutorialSeen,
    reset: resetTutorial,
  } = useTutorialState();

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

  const loadAdminData = useCallback(async (sid?: string) => {
    setAdminLoading(true);
    try {
      const [statsRes, weeklyRes, monthlyRes] = await Promise.all([
        getDashboardStatsAction(sid),
        getWeeklyTrendAction(sid),
        getMonthlyTrendAction(sid),
      ]);
      setStats(statsRes);
      setWeekly(weeklyRes);
      setMonthly(monthlyRes);
    } catch {
      toast.error("Impossible de charger le tableau de bord.");
    } finally {
      setAdminLoading(false);
    }
  }, []);

  // Single batch load on mount: role + sites + stats in ONE server call
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const batch = await getAdminDashboardBatchAction();
        if (cancelled) return;
        setUserRole(batch.role);

        if (batch.role === "employee") {
          setRoleLoading(false);
          setEmployeeLoading(true);
          try {
            const data = await getEmployeeDashboardAction();
            if (!cancelled) setEmployeeData(data);
          } catch {
            if (!cancelled) toast.error("Impossible de charger votre tableau de bord.");
          } finally {
            if (!cancelled) setEmployeeLoading(false);
          }
          return;
        }

        setSites(batch.sites);
        setStats(batch.stats);
        setWeekly(batch.weekly);
        setMonthly(batch.monthly);
      } catch {
        if (!cancelled) toast.error("Impossible de charger le tableau de bord.");
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reload data when site filter changes (after initial load)
  const [initialLoaded, setInitialLoaded] = useState(false);
  useEffect(() => {
    if (roleLoading) return;
    if (!initialLoaded) { setInitialLoaded(true); return; }
    if (isEmployee) return;
    loadAdminData(siteIdForAction);
  }, [siteIdForAction, roleLoading, isEmployee, loadAdminData, initialLoaded]);

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
    () => monthly.map((row) => ({ date: row.date, taux: row.rate })),
    [monthly],
  );

  const todayStatus = useMemo(() => {
    const rec = employeeData?.today;
    if (!rec?.clockIn) {
      return { text: "Non pointé" as const, sub: null as string | null };
    }
    if (!rec.clockOut) {
      return { text: `En service depuis ${fmtTime(rec.clockIn)}` as const, sub: null as string | null };
    }
    return { text: "Journée terminée" as const, sub: null as string | null };
  }, [employeeData]);

  const [forceTutorial, setForceTutorial] = useState(false);

  useEffect(() => {
    if (isWelcome && tutorialLoaded && !roleLoading && !isEmployee) {
      resetTutorial();
      setForceTutorial(true);
    }
  }, [isWelcome, tutorialLoaded, roleLoading, isEmployee, resetTutorial]);

  const showTutorial =
    (tutorialLoaded && modeLoaded && !tutorialSeen && !roleLoading && !isEmployee) ||
    forceTutorial;

  if (roleLoading || !modeLoaded || !tutorialLoaded) {
    return <DashboardSkeleton mode="admin" />;
  }

  /* ===== EMPLOYEE DASHBOARD ===== */
  if (isEmployee) {
    if (employeeLoading) return <DashboardSkeleton mode="employee" />;

    return (
      <>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">Mon espace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Suivez votre pointage et vos heures de travail en un coup d&apos;œil.
          </p>
        </div>

        {!employeeData ? (
          <div className="rounded-2xl border-2 border-dashed bg-muted/20 p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="mt-4 text-lg font-semibold">Profil non trouvé</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Aucun profil employé actif n&apos;est lié à votre compte. Contactez
              votre responsable pour être ajouté.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="mx-auto max-w-lg overflow-hidden rounded-2xl border-0 shadow-md">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 px-6 py-8 text-center">
                <p className="text-sm font-medium text-muted-foreground">Aujourd&apos;hui</p>
                <p className="mt-2 text-2xl font-bold">{todayStatus.text}</p>
                {todayStatus.sub && (
                  <p className="mt-1 text-sm text-muted-foreground">{todayStatus.sub}</p>
                )}
                <Button className="mt-5" asChild>
                  <Link href="/dashboard/attendance/clock">Pointer maintenant</Link>
                </Button>
              </div>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Cette semaine</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><span className="font-semibold">{fmtMin(employeeData.weekSummary.totalMinutes)}</span> travaillées</p>
                  <p className="text-muted-foreground">{employeeData.weekSummary.daysWorked} jour{employeeData.weekSummary.daysWorked !== 1 ? "s" : ""} de présence</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Ce mois</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p><span className="font-semibold">{fmtMin(employeeData.monthSummary.totalMinutes)}</span> travaillées</p>
                  <p className="text-muted-foreground">
                    {employeeData.monthSummary.daysWorked} jour{employeeData.monthSummary.daysWorked !== 1 ? "s" : ""} · {employeeData.monthSummary.daysLate} retard{employeeData.monthSummary.daysLate !== 1 ? "s" : ""}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl">
              <CardContent className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{employeeData.pendingLeaves} demande{employeeData.pendingLeaves !== 1 ? "s" : ""} de congé en attente</p>
                  <p className="text-xs text-muted-foreground">Suivez et gérez vos congés facilement.</p>
                </div>
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

  /* ===== ADMIN / MANAGER DASHBOARD ===== */
  const présentsToday = stats !== null ? stats.present + stats.completed : 0;

  return (
    <>
      {showTutorial && (
        <OnboardingTutorial
          onComplete={() => {
            markTutorialSeen();
            setForceTutorial(false);
          }}
        />
      )}

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatTodayDescription()} — Vue d&apos;ensemble de votre activité.
            </p>
          </div>
          {sites.length > 0 && (
            <Select
              value={siteFilter}
              onValueChange={(v) => setSiteFilter(v || ALL_SITES)}
            >
              <SelectTrigger className="w-[180px] min-w-0 rounded-xl" size="sm">
                <SelectValue placeholder="Filtrer par lieu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SITES}>Tous les lieux</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Mode switch — bien visible */}
        <div data-tour="mode-switch" className="mt-4 flex items-center justify-between rounded-2xl border bg-muted/30 px-4 py-3">
          <div className="mr-4 min-w-0">
            <p className="text-sm font-medium">Mode d&apos;affichage</p>
            <p className="text-xs text-muted-foreground">
              {mode === "simple"
                ? "Affiche uniquement l'essentiel pour un usage rapide."
                : "Affiche tous les détails et graphiques."}
            </p>
          </div>
          <ModeSwitch mode={mode} onChange={setMode} />
        </div>
      </div>

      {adminLoading && !stats ? (
        <DashboardSkeleton mode="admin" />
      ) : (
        <div className={adminLoading ? "opacity-60 transition-opacity" : ""}>
          {/* ===== KPI CARDS ===== */}
          <div data-tour="kpi-cards" className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <StatCard
              label="Employés actifs"
              subtitle="Personnes enregistrées dans votre entreprise"
              value={stats?.totalEmployees ?? "—"}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Présents"
              subtitle="Employés qui ont déjà pointé aujourd'hui"
              value={stats != null ? présentsToday : "—"}
              icon={UserCheck}
              color="green"
            />
            <StatCard
              label="En retard"
              subtitle="Arrivés après l'heure prévue"
              value={stats?.late ?? "—"}
              icon={Clock}
              color="amber"
            />
            <StatCard
              label="Absents"
              subtitle="Non pointés ou signalés absents"
              value={stats?.absent ?? "—"}
              icon={UserX}
              color="red"
            />
          </div>

          {/* ===== ADVANCED MODE — Extra KPIs ===== */}
          {mode === "advanced" && (
            <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <StatCard
                label="Taux de présence"
                subtitle="Pourcentage d'employés présents aujourd'hui"
                value={stats != null ? `${stats.attendanceRate} %` : "—"}
                icon={TrendingUp}
                color="purple"
              />
              <StatCard
                label="Heures moy."
                subtitle="Durée moyenne travaillée par employé"
                value={stats != null ? fmtMin(stats.avgWorkedMinutes) : "—"}
                icon={Timer}
                color="indigo"
              />
              <StatCard
                label="Congés en attente"
                subtitle="Demandes à valider"
                value={stats?.pendingLeaves ?? "—"}
                icon={Calendar}
                color="orange"
              />
              <StatCard
                label="Corrections"
                subtitle="Demandes de correction de pointage"
                value={stats?.pendingCorrections ?? "—"}
                icon={FileEdit}
                color="slate"
              />
            </div>
          )}

          {/* ===== SIMPLE MODE — Quick actions ===== */}
          {mode === "simple" && (
            <div data-tour="quick-actions" className="mt-6 space-y-4 sm:mt-8">
              <div>
                <h2 className="text-lg font-semibold">Commencer rapidement</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Accédez aux outils les plus importants en un clic.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <QuickAction
                  icon={UserPlus}
                  title="Ajouter un employé"
                  description="Enregistrez les personnes qui travaillent chez vous."
                  href="/dashboard/employees/new"
                  color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                />
                <QuickAction
                  icon={MapPin}
                  title="Configurer un lieu"
                  description="Définissez les lieux autorisés pour le pointage."
                  href="/dashboard/sites/new"
                  color="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                />
                <QuickAction
                  icon={Clock}
                  title="Pointage en direct"
                  description="Voyez en temps réel qui a pointé aujourd'hui."
                  href="/dashboard/attendance"
                  color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                />
                <QuickAction
                  icon={Calendar}
                  title="Gérer les congés"
                  description="Suivez et validez les demandes de congé facilement."
                  href="/dashboard/leaves"
                  color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                />
                <QuickAction
                  icon={BarChart3}
                  title="Voir les rapports"
                  description="Consultez les statistiques de présence et retards."
                  href="/dashboard/reports"
                  color="bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
                />
                <QuickAction
                  icon={Users}
                  title="Liste des employés"
                  description="Consultez et gérez tous vos employés."
                  href="/dashboard/employees"
                  color="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                />
              </div>
            </div>
          )}

          {/* ===== CHARTS — Advanced only ===== */}
          {mode === "advanced" && (
            <div className="mt-6 grid gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden rounded-2xl border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Tendance hebdomadaire
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Présents et retards jour par jour, cette semaine.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <LazyResponsiveContainer width="100%" height={280}>
                      <LazyBarChart data={weeklyChartData}>
                        <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
                        <LazyXAxis dataKey="day" tick={{ fontSize: 12 }} />
                        <LazyYAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                        <LazyTooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                          labelFormatter={(l) => String(l)}
                          formatter={(value, name) => [
                            Number(value ?? 0),
                            name === "presents" ? "Présents" : "Retards",
                          ]}
                        />
                        <LazyBar dataKey="presents" name="presents" fill="#22c55e" radius={[6, 6, 0, 0]} />
                        <LazyBar dataKey="retards" name="Retards" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                      </LazyBarChart>
                    </LazyResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-2xl border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Taux de présence mensuel
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Évolution du pourcentage de présence sur le mois.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[280px] w-full">
                    <LazyResponsiveContainer width="100%" height={280}>
                      <LazyLineChart data={monthlyChartData}>
                        <LazyCartesianGrid strokeDasharray="3 3" className="stroke-muted/60" />
                        <LazyXAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) =>
                            new Date(`${String(v)}T12:00:00`).toLocaleDateString("fr-FR", {
                              day: "numeric",
                              month: "short",
                            })
                          }
                        />
                        <LazyYAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                        <LazyTooltip
                          contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb" }}
                          labelFormatter={(v) =>
                            new Date(`${String(v)}T12:00:00`).toLocaleDateString("fr-FR", {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })
                          }
                          formatter={(value) => [`${Number(value ?? 0)} %`, "Taux"]}
                        />
                        <LazyLine
                          type="monotone"
                          dataKey="taux"
                          name="Taux de présence"
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#6366f1" }}
                          activeDot={{ r: 5 }}
                        />
                      </LazyLineChart>
                    </LazyResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== QUICK LINKS — both modes ===== */}
          <div data-tour="quick-links" className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3">
            <Link
              href="/dashboard/attendance"
              className="group flex items-center gap-3 rounded-2xl border bg-white p-4 transition-all hover:border-green-200 hover:shadow-md dark:bg-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Pointage en direct</p>
                <p className="text-xs text-muted-foreground">Voir qui est présent</p>
              </div>
            </Link>
            <Link
              href="/dashboard/reports"
              className="group flex items-center gap-3 rounded-2xl border bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-md dark:bg-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Rapports</p>
                <p className="text-xs text-muted-foreground">Statistiques détaillées</p>
              </div>
            </Link>
            <Link
              href="/dashboard/leaves"
              className="group flex items-center gap-3 rounded-2xl border bg-white p-4 transition-all hover:border-amber-200 hover:shadow-md dark:bg-card"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Congés</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingLeaves ?? 0} en attente
                </p>
              </div>
            </Link>
          </div>

          {/* ===== Help bar ===== */}
          <div data-tour="help-bar" className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-muted/20 p-4 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Besoin d&apos;aide ?</p>
                <p className="text-xs text-muted-foreground">
                  Suivez le guide de prise en main ou consultez le centre d&apos;aide.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => {
                  resetTutorial();
                  setForceTutorial(true);
                }}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Revoir le guide
              </Button>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link href="/dashboard/help">Centre d&apos;aide</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
