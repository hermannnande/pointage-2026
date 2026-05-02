"use client";

/**
 * Super Admin → Utilisation & Engagement
 *
 * Tableau de bord d'analyse d'usage : permet de vérifier d'un coup d'œil
 * que la plateforme est réellement utilisée chaque jour, par qui, et
 * d'identifier les comptes dormants à relancer.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  LogIn,
  Mail,
  MoonStar,
  Phone,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getCompanyEngagementAction,
  getDailyActivityTrendAction,
  getDormantCompaniesAction,
  getActivityHeatmapAction,
  getOnboardingFunnelAction,
  getUsageOverviewAction,
  getUsersActivityAction,
} from "../actions";

const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false },
);
const LineChart = dynamic(() => import("recharts").then((m) => m.LineChart), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });

type Overview = Awaited<ReturnType<typeof getUsageOverviewAction>>;
type DailyTrend = Awaited<ReturnType<typeof getDailyActivityTrendAction>>;
type Heatmap = Awaited<ReturnType<typeof getActivityHeatmapAction>>;
type Funnel = Awaited<ReturnType<typeof getOnboardingFunnelAction>>;
type Engagement = Awaited<ReturnType<typeof getCompanyEngagementAction>>;
type Dormant = Awaited<ReturnType<typeof getDormantCompaniesAction>>;
type UsersActivity = Awaited<ReturnType<typeof getUsersActivityAction>>;

const DOW_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("fr-FR");
}

function formatRelative(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `il y a ${diffD} j`;
  return date.toLocaleDateString("fr-FR");
}

function statusBadge(status: "active" | "idle" | "dormant" | "never") {
  const cfg = {
    active: { label: "Actif", cls: "bg-green-100 text-green-700 border-green-200" },
    idle: { label: "Ralenti", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    dormant: { label: "Dormant", cls: "bg-red-100 text-red-700 border-red-200" },
    never: { label: "Jamais utilisé", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  }[status];
  return <Badge variant="outline" className={`${cfg.cls} text-[10px]`}>{cfg.label}</Badge>;
}

export default function UsagePage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<DailyTrend>([]);
  const [heatmap, setHeatmap] = useState<Heatmap>([]);
  const [funnel, setFunnel] = useState<Funnel>([]);
  const [engagement, setEngagement] = useState<Engagement>([]);
  const [dormant, setDormant] = useState<Dormant>([]);
  const [users, setUsers] = useState<UsersActivity>([]);
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState<7 | 30 | 90>(30);
  const [dormantThreshold, setDormantThreshold] = useState<3 | 7 | 14>(7);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, tr, hm, fn, eg, dm, us] = await Promise.all([
        getUsageOverviewAction(),
        getDailyActivityTrendAction(trendDays),
        getActivityHeatmapAction(),
        getOnboardingFunnelAction(30),
        getCompanyEngagementAction(50),
        getDormantCompaniesAction(dormantThreshold, 20),
        getUsersActivityAction(20),
      ]);
      setOverview(ov);
      setTrend(tr);
      setHeatmap(hm);
      setFunnel(fn);
      setEngagement(eg);
      setDormant(dm);
      setUsers(us);
    } finally {
      setLoading(false);
    }
  }, [trendDays, dormantThreshold]);

  useEffect(() => {
    void load();
  }, [load]);

  const heatMaxCount = useMemo(
    () => heatmap.reduce((m, c) => (c.count > m ? c.count : m), 0),
    [heatmap],
  );

  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Utilisation & Engagement
            </h1>
            <p className="text-sm text-slate-500">
              Vérifiez en un coup d&apos;œil que la plateforme est utilisée chaque jour
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const kpiCards: {
    label: string;
    value: string;
    sub: string;
    icon: typeof Activity;
    bg: string;
    fg: string;
  }[] = [
    {
      label: "Entreprises actives aujourd'hui",
      value: fmt(overview.dauCompanies),
      sub: `sur ${fmt(overview.totalCompanies)} (${
        overview.totalCompanies
          ? Math.round((overview.dauCompanies / overview.totalCompanies) * 100)
          : 0
      }%)`,
      icon: Building2,
      bg: "bg-blue-50",
      fg: "text-blue-600",
    },
    {
      label: "Employés ayant pointé aujourd'hui",
      value: fmt(overview.dauEmployees),
      sub: `${fmt(overview.clockingsToday)} pointages aujourd'hui`,
      icon: UserCheck,
      bg: "bg-green-50",
      fg: "text-green-600",
    },
    {
      label: "Comptes connectés (24h)",
      value: fmt(overview.dauOwners),
      sub: `${overview.onlineNow} en ligne maintenant`,
      icon: LogIn,
      bg: "bg-purple-50",
      fg: "text-purple-600",
    },
    {
      label: "Actives sur 7j",
      value: fmt(overview.wauCompanies),
      sub: `${fmt(overview.wauEmployees)} employés actifs`,
      icon: TrendingUp,
      bg: "bg-sky-50",
      fg: "text-sky-600",
    },
    {
      label: "Actives sur 30j",
      value: fmt(overview.mauCompanies),
      sub: `Engagement ${overview.engagementRate}%`,
      icon: Activity,
      bg: "bg-indigo-50",
      fg: "text-indigo-600",
    },
    {
      label: "Stickiness (DAU/MAU)",
      value: `${overview.stickiness}%`,
      sub:
        overview.stickiness >= 30
          ? "Excellent — usage quotidien"
          : overview.stickiness >= 15
            ? "Bon — usage régulier"
            : "Faible — usage sporadique",
      icon: Flame,
      bg: "bg-orange-50",
      fg: "text-orange-600",
    },
    {
      label: "Pointages cette semaine",
      value: fmt(overview.clockingsWeek),
      sub: `${fmt(overview.clockingsMonth)} ce mois`,
      icon: CheckCircle2,
      bg: "bg-teal-50",
      fg: "text-teal-600",
    },
    {
      label: "Comptes jamais utilisés",
      value: fmt(overview.companiesNeverClocked),
      sub:
        overview.companiesNeverClocked > 0
          ? "À relancer en priorité"
          : "Toutes ont pointé au moins 1 fois",
      icon: AlertTriangle,
      bg:
        overview.companiesNeverClocked > 0
          ? "bg-red-50"
          : "bg-slate-50",
      fg:
        overview.companiesNeverClocked > 0 ? "text-red-600" : "text-slate-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Utilisation & Engagement
          </h1>
          <p className="text-sm text-slate-500">
            Mesurez l&apos;usage réel de la plateforme par les entreprises, leurs comptes et leurs employés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            {overview.onlineNow} en ligne
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    {k.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {k.value}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-400">{k.sub}</p>
                </div>
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${k.bg} ${k.fg}`}
                >
                  <k.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily trend */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-blue-500" />
            Activité quotidienne
          </CardTitle>
          <div className="flex gap-1 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setTrendDays(d)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  trendDays === d
                    ? "bg-blue-500 text-white"
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                {d}j
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                labelFormatter={(label) => {
                  const v = String(label ?? "");
                  if (!v) return "";
                  const d = new Date(v);
                  return Number.isNaN(d.getTime())
                    ? v
                    : d.toLocaleDateString("fr-FR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      });
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="clockings"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Pointages"
              />
              <Line
                type="monotone"
                dataKey="employees"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Employés actifs"
              />
              <Line
                type="monotone"
                dataKey="companies"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
                name="Entreprises actives"
              />
              <Line
                type="monotone"
                dataKey="logins"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={false}
                name="Connexions comptes"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Funnel + Heatmap */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel onboarding */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Funnel d&apos;onboarding (30 derniers jours)
            </CardTitle>
            <p className="text-xs text-slate-400">
              À chaque étape, % des nouvelles entreprises qui ont franchi le pas
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnel.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Aucune nouvelle entreprise sur cette période
                </p>
              ) : (
                funnel.map((f, i) => {
                  const previousCount = i === 0 ? f.count : funnel[i - 1].count;
                  const dropoff =
                    i === 0 || previousCount === 0
                      ? null
                      : Math.round(((previousCount - f.count) / previousCount) * 100);
                  return (
                    <div key={f.step}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {f.step}
                        </span>
                        <span className="font-semibold text-slate-600">
                          {f.count} <span className="text-slate-400">· {f.pct}%</span>
                        </span>
                      </div>
                      <div className="mt-1 h-7 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                        <div
                          className="flex h-full items-center justify-end bg-gradient-to-r from-emerald-400 to-emerald-600 px-2 text-[10px] font-bold text-white transition-all"
                          style={{ width: `${Math.max(2, f.pct)}%` }}
                        >
                          {f.pct}%
                        </div>
                      </div>
                      {dropoff !== null && dropoff > 0 && (
                        <p className="mt-0.5 text-right text-[10px] text-red-500">
                          ↓ -{dropoff}% vs étape précédente
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-orange-500" />
              Quand pointent-ils ? (30 derniers jours)
            </CardTitle>
            <p className="text-xs text-slate-400">
              Plus la cellule est foncée, plus il y a de pointages à cette heure
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="inline-block min-w-full">
                <div className="flex">
                  <div className="w-10" />
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div
                      key={h}
                      className="flex-1 text-center text-[8px] text-slate-400"
                      style={{ minWidth: 14 }}
                    >
                      {h % 3 === 0 ? h : ""}
                    </div>
                  ))}
                </div>
                {Array.from({ length: 7 }).map((_, dow) => (
                  <div key={dow} className="flex items-center">
                    <div className="w-10 text-[10px] font-medium text-slate-500">
                      {DOW_LABELS[dow]}
                    </div>
                    {Array.from({ length: 24 }).map((_, h) => {
                      const cell = heatmap.find((c) => c.dow === dow && c.hour === h);
                      const v = cell?.count ?? 0;
                      const intensity = heatMaxCount > 0 ? v / heatMaxCount : 0;
                      const bg =
                        v === 0
                          ? "bg-slate-100 dark:bg-slate-800"
                          : intensity > 0.7
                            ? "bg-orange-600"
                            : intensity > 0.4
                              ? "bg-orange-400"
                              : intensity > 0.2
                                ? "bg-orange-300"
                                : "bg-orange-200";
                      return (
                        <div
                          key={h}
                          title={`${DOW_LABELS[dow]} ${h}h — ${v} pointage${v > 1 ? "s" : ""}`}
                          className={`mx-px h-4 flex-1 rounded-sm ${bg} cursor-pointer transition-transform hover:scale-150`}
                          style={{ minWidth: 14 }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-slate-400">
              <span>Moins</span>
              <div className="h-3 w-3 rounded-sm bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-3 rounded-sm bg-orange-200" />
              <div className="h-3 w-3 rounded-sm bg-orange-300" />
              <div className="h-3 w-3 rounded-sm bg-orange-400" />
              <div className="h-3 w-3 rounded-sm bg-orange-600" />
              <span>Plus</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Engagement par entreprise */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-blue-500" />
            Engagement par entreprise (top 50)
          </CardTitle>
          <p className="text-xs text-slate-400">
            Triées par dernière activité — repérez vite qui est actif et qui ralentit
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                    Entreprise
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                    Statut
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-slate-500">
                    Employés
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-slate-500">
                    Pointages 7j
                  </th>
                  <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase text-slate-500">
                    Pointages 30j
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                    Dernier pointage
                  </th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase text-slate-500">
                    Connexion compte
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {engagement.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-sm text-slate-400"
                    >
                      Aucune entreprise active
                    </td>
                  </tr>
                ) : (
                  engagement.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                        <div className="text-[10px] text-slate-400">
                          {c.country} · {c.planName ?? "Sans plan"}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">{statusBadge(c.status)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <span className="font-semibold">{c.employeesActive}</span>
                        <span className="text-slate-400"> / {c.employeesTotal}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">
                        {c.clockings7d}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{c.clockings30d}</td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-600 dark:text-slate-400">
                        {formatRelative(c.lastClockAt)}
                      </td>
                      <td className="px-3 py-2.5 text-[12px] text-slate-600 dark:text-slate-400">
                        {formatRelative(c.ownerLastLoginAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Link
                          href={`/super-admin/companies/${c.id}`}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          Voir <ExternalLink className="h-3 w-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dormant + Users activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Dormant */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MoonStar className="h-4 w-4 text-red-500" />
                Comptes dormants à relancer
              </CardTitle>
              <p className="text-xs text-slate-400">
                Aucun pointage depuis {dormantThreshold} jour{dormantThreshold > 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-1 rounded-md border border-slate-200 p-0.5 dark:border-slate-700">
              {([3, 7, 14] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDormantThreshold(d)}
                  className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    dormantThreshold === d
                      ? "bg-red-500 text-white"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {d}j
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {dormant.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Aucun compte dormant — tout le monde est actif
              </p>
            ) : (
              <div className="space-y-2 max-h-[460px] overflow-y-auto">
                {dormant.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/super-admin/companies/${c.id}`}
                            className="truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                          >
                            {c.name}
                          </Link>
                          <span className="text-[10px] text-slate-400">{c.country}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {c.ownerName ?? "Propriétaire ?"} · {c.employeesCount} employé
                          {c.employeesCount > 1 ? "s" : ""} ·{" "}
                          {c.totalClockings === 0
                            ? "jamais pointé"
                            : `${c.totalClockings} pointages historiques`}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.ownerEmail && (
                            <a
                              href={`mailto:${c.ownerEmail}`}
                              className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 hover:bg-blue-100"
                            >
                              <Mail className="h-3 w-3" />
                              {c.ownerEmail}
                            </a>
                          )}
                          {c.ownerPhone && (
                            <a
                              href={`https://wa.me/${c.ownerPhone.replace(/\D/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-[11px] text-green-700 hover:bg-green-100"
                            >
                              <Phone className="h-3 w-3" />
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="ml-3 text-right">
                        <Badge
                          variant="outline"
                          className="border-red-200 bg-red-50 text-[10px] text-red-700"
                        >
                          {c.daysSinceLastClock != null
                            ? `${c.daysSinceLastClock}j sans pointage`
                            : "jamais utilisé"}
                        </Badge>
                        <p className="mt-1 text-[10px] text-slate-400">
                          dern. login {formatRelative(c.ownerLastLoginAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-indigo-500" />
              Activité des comptes (20 derniers connectés)
            </CardTitle>
            <p className="text-xs text-slate-400">
              Voyez qui a utilisé son compte récemment et sur combien d&apos;appareils
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[460px] overflow-y-auto">
              {users.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Aucune connexion récente
                </p>
              ) : (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      {(u.fullName?.charAt(0) ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {u.fullName}
                        </span>
                        {u.isSuperAdmin && (
                          <Badge variant="outline" className="border-red-200 bg-red-50 text-[9px] text-red-700">
                            Admin
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {u.companyName ?? "—"} · {u.role ?? "—"} · {u.deviceCount} appareil
                        {u.deviceCount > 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        {formatRelative(u.lastLoginAt)}
                      </p>
                      <p className="text-[9px] text-slate-400">{u.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
