"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2, Users, MapPin, CreditCard, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, Clock, DollarSign, Activity, BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from "recharts";

import {
  getDashboardKPIsAction,
  getRegistrationTrendAction,
  getRevenueTrendAction,
  getSubscriptionDistributionAction,
  getTopActiveCompaniesAction,
} from "./actions";

const PIE_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#64748b"];
const SUB_LABELS: Record<string, string> = {
  TRIALING: "Essai", ACTIVE: "Actif", PAST_DUE: "Impayé",
  GRACE_PERIOD: "Grâce", CANCELLED: "Annulé", EXPIRED: "Expiré",
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString("fr-FR");
}
function fmtXOF(n: number) {
  return `${fmt(n)} XOF`;
}

type KPIs = Awaited<ReturnType<typeof getDashboardKPIsAction>>;

export default function SuperAdminDashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [regTrend, setRegTrend] = useState<{ month: string; count: number }[]>([]);
  const [revTrend, setRevTrend] = useState<{ month: string; revenue: number }[]>([]);
  const [subDist, setSubDist] = useState<{ status: string; count: number }[]>([]);
  const [topCompanies, setTopCompanies] = useState<{ name: string; clockings: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [k, reg, rev, dist, top] = await Promise.all([
        getDashboardKPIsAction(),
        getRegistrationTrendAction(6),
        getRevenueTrendAction(6),
        getSubscriptionDistributionAction(),
        getTopActiveCompaniesAction(8),
      ]);
      setKpis(k);
      setRegTrend(reg);
      setRevTrend(rev);
      setSubDist(dist);
      setTopCompanies(top);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (loading || !kpis) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Super Admin</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: "Entreprises", value: fmt(kpis.totalCompanies), sub: `+${kpis.newThisMonth} ce mois`, icon: Building2, color: "text-blue-600 bg-blue-50" },
    { label: "Employés", value: fmt(kpis.totalEmployees), sub: `${kpis.totalSites} sites`, icon: Users, color: "text-green-600 bg-green-50" },
    { label: "Abonnements actifs", value: fmt(kpis.activeSubs), sub: `${kpis.trialing} en essai`, icon: CreditCard, color: "text-purple-600 bg-purple-50" },
    { label: "Revenus du mois", value: fmtXOF(kpis.revenueMonth), sub: `Total: ${fmtXOF(kpis.revenueTotal)}`, icon: DollarSign, color: "text-emerald-600 bg-emerald-50" },
    { label: "Nouvelles aujourd'hui", value: fmt(kpis.newToday), sub: `${kpis.newThisWeek} cette semaine`, icon: TrendingUp, color: "text-sky-600 bg-sky-50" },
    { label: "Taux conversion", value: `${kpis.conversionRate}%`, sub: "Essai → Abonnement", icon: BarChart3, color: "text-amber-600 bg-amber-50" },
    { label: "Tx réussies / échouées", value: `${fmt(kpis.txSuccess)} / ${fmt(kpis.txFailed)}`, sub: "Transactions", icon: CheckCircle, color: "text-teal-600 bg-teal-50" },
    { label: "Expirés / Suspendus", value: `${fmt(kpis.expired)} / ${fmt(kpis.cancelled)}`, sub: `${kpis.pastDue} impayé(s)`, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
    { label: "Actives (7j)", value: fmt(kpis.recentActiveCompanies), sub: `${kpis.inactiveCompanies} inactives`, icon: Activity, color: "text-indigo-600 bg-indigo-50" },
    { label: "Sites créés", value: fmt(kpis.totalSites), sub: "Tous les sites", icon: MapPin, color: "text-orange-600 bg-orange-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard Super Admin</h1>
          <p className="text-sm text-slate-500">Vue globale de la plateforme OControle</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          En ligne
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500">{k.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{k.value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{k.sub}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${k.color}`}>
                  <k.icon className="h-4 w-4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Inscriptions (6 mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={regTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Inscriptions" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              Revenus (6 mois)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={revTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => fmtXOF(Number(v ?? 0))} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Revenus" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="h-4 w-4 text-purple-500" />
              Répartition abonnements
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={subDist} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={90} label>
                  {subDist.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-orange-500" />
              Top entreprises actives (7j)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCompanies.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Aucune activité récente</p>
            ) : (
              <div className="space-y-2">
                {topCompanies.map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold dark:bg-slate-700">{i + 1}</span>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">{c.clockings} pointages</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
