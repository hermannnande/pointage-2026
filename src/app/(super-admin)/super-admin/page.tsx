"use client";

// Dashboard Super Admin V2 — statistiques par période (jour / semaine /
// mois / trimestre / année) avec comparaison vs période précédente,
// alertes opérationnelles et flux d'activité en direct.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Activity,
  Smartphone,
  Fingerprint,
  UserPlus,
  RefreshCw,
  Radio,
  XCircle,
  CheckCircle2,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  getSubscriptionDistributionAction,
  getTopActiveCompaniesAction,
} from "./actions";
import {
  getPeriodStatsAction,
  getMultiTrendAction,
  getDashboardAlertsAction,
  getLiveFeedAction,
} from "./actions-v2";
import type { StatPeriod } from "@/services/super-admin-analytics.service";

const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const ComposedChart = dynamic(() => import("recharts").then((m) => m.ComposedChart), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then((m) => m.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then((m) => m.Area), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });
const PieChart = dynamic(() => import("recharts").then((m) => m.PieChart), { ssr: false });
const Pie = dynamic(() => import("recharts").then((m) => m.Pie), { ssr: false });
const Cell = dynamic(() => import("recharts").then((m) => m.Cell), { ssr: false });

// ─── Helpers ─────────────────────────────────────────────────

const PERIODS: { key: StatPeriod; label: string }[] = [
  { key: "today", label: "Aujourd'hui" },
  { key: "7d", label: "7 jours" },
  { key: "30d", label: "30 jours" },
  { key: "90d", label: "90 jours" },
  { key: "12m", label: "12 mois" },
];

const PERIOD_COMPARE_LABEL: Record<StatPeriod, string> = {
  today: "vs hier",
  "7d": "vs 7 jours préc.",
  "30d": "vs 30 jours préc.",
  "90d": "vs 90 jours préc.",
  "12m": "vs année préc.",
};

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
const SUB_LABELS: Record<string, string> = {
  TRIALING: "Essai",
  ACTIVE: "Actif",
  PAST_DUE: "Impayé",
  GRACE_PERIOD: "Grâce",
  CANCELLED: "Annulé",
  EXPIRED: "Expiré",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString("fr-FR");
}
function fmtXOF(n: number) {
  return `${fmt(n)} F`;
}
function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `il y a ${days} j`;
  return d.toLocaleDateString("fr-FR");
}

type PeriodStats = Awaited<ReturnType<typeof getPeriodStatsAction>>;
type TrendData = Awaited<ReturnType<typeof getMultiTrendAction>>;
type Alerts = Awaited<ReturnType<typeof getDashboardAlertsAction>>;
type Feed = Awaited<ReturnType<typeof getLiveFeedAction>>;

// ─── Composants ──────────────────────────────────────────────

function DeltaBadge({ delta, invert = false }: { delta: number | null; invert?: boolean }) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
        <TrendingUp className="h-2.5 w-2.5" /> Nouveau
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
        <Minus className="h-2.5 w-2.5" /> 0%
      </span>
    );
  }
  const positive = delta > 0;
  const good = invert ? !positive : positive;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
        good
          ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      )}
    >
      {positive ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
      {positive ? "+" : ""}
      {delta}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  sub,
  delta,
  invert,
  compareLabel,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  delta: number | null;
  invert?: boolean;
  compareLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <DeltaBadge delta={delta} invert={invert} />
              <span className="text-[10px] text-slate-400">{compareLabel}</span>
            </div>
            {sub && <p className="mt-1 truncate text-[11px] text-slate-400">{sub}</p>}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", color)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const FEED_STYLE: Record<Feed[number]["kind"], { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  signup: { icon: UserPlus, color: "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  payment_success: { icon: CheckCircle2, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
  payment_failed: { icon: XCircle, color: "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400" },
  app_connection: { icon: Smartphone, color: "bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
  admin_action: { icon: Fingerprint, color: "bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
};

// ─── Page ────────────────────────────────────────────────────

export default function SuperAdminDashboardPage() {
  const [period, setPeriod] = useState<StatPeriod>("30d");
  const [stats, setStats] = useState<PeriodStats | null>(null);
  const [trend, setTrend] = useState<TrendData>([]);
  const [alerts, setAlerts] = useState<Alerts | null>(null);
  const [feed, setFeed] = useState<Feed>([]);
  const [subDist, setSubDist] = useState<{ status: string; count: number }[]>([]);
  const [topCompanies, setTopCompanies] = useState<{ name: string; clockings: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPeriod = useCallback(async (p: StatPeriod) => {
    const [s, t] = await Promise.all([getPeriodStatsAction(p), getMultiTrendAction(p)]);
    setStats(s);
    setTrend(t);
  }, []);

  const loadStatic = useCallback(async () => {
    const [a, f, dist, top] = await Promise.all([
      getDashboardAlertsAction(),
      getLiveFeedAction(25),
      getSubscriptionDistributionAction(),
      getTopActiveCompaniesAction(8),
    ]);
    setAlerts(a);
    setFeed(f);
    setSubDist(dist);
    setTopCompanies(top);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadPeriod(period), loadStatic()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePeriod = useCallback(
    async (p: StatPeriod) => {
      setPeriod(p);
      setRefreshing(true);
      try {
        await loadPeriod(p);
      } finally {
        setRefreshing(false);
      }
    },
    [loadPeriod],
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadPeriod(period), loadStatic()]);
    } finally {
      setRefreshing(false);
    }
  }, [period, loadPeriod, loadStatic]);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-80 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const compareLabel = PERIOD_COMPARE_LABEL[period];

  const alertItems = alerts
    ? [
        { count: alerts.failedPayments7d, label: "paiements échoués (7j)", href: "/super-admin/payments", tone: "red" },
        { count: alerts.pastDue, label: "abonnements impayés", href: "/super-admin/payments", tone: "red" },
        { count: alerts.trialsExpiring3d, label: "essais expirent sous 3j", href: "/super-admin/trials", tone: "amber" },
        { count: alerts.stuckSignups, label: "inscriptions bloquées", href: "/super-admin/signups", tone: "amber" },
        { count: alerts.dormantCompanies, label: "entreprises dormantes (7j)", href: "/super-admin/usage", tone: "slate" },
      ].filter((a) => a.count > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Vue d&apos;ensemble
          </h1>
          <p className="text-sm text-slate-500">
            Plateforme OControle — données comparées {compareLabel.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => changePeriod(p.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  period === p.key
                    ? "bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={refreshAll}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:hover:text-white"
            title="Actualiser"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Alertes */}
      {alertItems.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alertItems.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all hover:scale-[1.02]",
                a.tone === "red" &&
                  "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
                a.tone === "amber" &&
                  "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400",
                a.tone === "slate" &&
                  "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400",
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              <strong>{a.count}</strong> {a.label}
            </Link>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className={cn("grid grid-cols-2 gap-4 md:grid-cols-4", refreshing && "opacity-60")}>
        <KpiCard
          label="Nouvelles entreprises"
          value={fmt(stats.companies.current)}
          delta={stats.companies.delta}
          compareLabel={compareLabel}
          icon={Building2}
          color="bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        />
        <KpiCard
          label="Nouveaux employés"
          value={fmt(stats.employees.current)}
          delta={stats.employees.delta}
          compareLabel={compareLabel}
          icon={Users}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
        />
        <KpiCard
          label="Pointages"
          value={fmt(stats.clockings.current)}
          sub={`${fmt(stats.activeCompanies.current)} entreprises actives`}
          delta={stats.clockings.delta}
          compareLabel={compareLabel}
          icon={Clock}
          color="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
        />
        <KpiCard
          label="Revenus"
          value={fmtXOF(stats.revenue.current)}
          sub={`${stats.paymentsSuccess.current} paiement(s) reçu(s)`}
          delta={stats.revenue.delta}
          compareLabel={compareLabel}
          icon={DollarSign}
          color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
        />
        <KpiCard
          label="Connexions app mobile"
          value={fmt(stats.appConnections.current)}
          sub={`${fmt(stats.appUsers.current)} utilisateur(s) distinct(s)`}
          delta={stats.appConnections.delta}
          compareLabel={compareLabel}
          icon={Smartphone}
          color="bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
        />
        <KpiCard
          label="Connexions web"
          value={fmt(stats.ownerLogins.current)}
          delta={stats.ownerLogins.delta}
          compareLabel={compareLabel}
          icon={Activity}
          color="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
        />
        <KpiCard
          label="Paiements échoués"
          value={fmt(stats.paymentsFailed.current)}
          sub={`${stats.checkoutsStarted.current} checkout(s) démarré(s)`}
          delta={stats.paymentsFailed.delta}
          invert
          compareLabel={compareLabel}
          icon={XCircle}
          color="bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
        />
        <KpiCard
          label="Entreprises actives"
          value={fmt(stats.activeCompanies.current)}
          sub="≥ 1 pointage sur la période"
          delta={stats.activeCompanies.delta}
          compareLabel={compareLabel}
          icon={Radio}
          color="bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400"
        />
      </div>

      {/* Graphiques principaux */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-indigo-500" />
              Activité — pointages, inscriptions, app mobile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="gPointages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gApp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10 }} width={36} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="pointages" name="Pointages" stroke="#6366f1" fill="url(#gPointages)" strokeWidth={2} />
                <Area type="monotone" dataKey="connexionsApp" name="Connexions app" stroke="#8b5cf6" fill="url(#gApp)" strokeWidth={2} />
                <Area type="monotone" dataKey="inscriptions" name="Inscriptions" stroke="#3b82f6" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Revenus &amp; paiements échoués
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis yAxisId="rev" tick={{ fontSize: 10 }} width={44} tickFormatter={(v: number) => fmt(v)} />
                <YAxis yAxisId="fail" orientation="right" tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                <Tooltip formatter={(v, name) => (name === "Revenus" ? fmtXOF(Number(v ?? 0)) : Number(v ?? 0))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar yAxisId="rev" dataKey="revenus" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Line yAxisId="fail" type="monotone" dataKey="echecs" name="Échecs" stroke="#ef4444" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Rangée basse : répartition, top actives, flux */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-purple-500" />
              Répartition abonnements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={subDist.map((s) => ({ ...s, name: SUB_LABELS[s.status] ?? s.status }))}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {subDist.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Top entreprises actives (7j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Aucune activité récente</p>
            ) : (
              <div className="space-y-1.5">
                {topCompanies.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          i === 0
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                        {c.name}
                      </span>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-500">
                      {fmt(c.clockings)} pointages
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Radio className="h-4 w-4 animate-pulse text-red-500" />
              En direct
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-[260px] space-y-1 overflow-y-auto pr-1">
            {feed.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Aucune activité</p>
            ) : (
              feed.map((item) => {
                const style = FEED_STYLE[item.kind];
                return (
                  <div key={item.id} className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full", style.color)}>
                      <style.icon className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.title}</p>
                      <p className="truncate text-[11px] text-slate-500">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(item.at)}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
