"use client";

/**
 * Super Admin → App mobile (APK)
 *
 * Qui a installé / se connecte à l'application Android : propriétaires,
 * employés, par entreprise, avec tendance dans le temps. Alimenté par
 * `AppConnectionLog`, écrit à chaque login réussi depuis l'APK (owner
 * exchange Supabase + employee login téléphone/mdp).
 *
 * "Installation" au sens strict n'est pas mesurable côté serveur (aucune
 * télémétrie ne remonte tant que l'utilisateur ne se connecte pas) — ces
 * chiffres mesurent donc l'adoption réelle : qui s'est connecté au moins
 * une fois via l'app.
 */

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  Building2,
  CheckCircle2,
  Circle,
  LogIn,
  Smartphone,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getAppConnectionTrendAction,
  getCompanyAppAdoptionAction,
  getMobileAppOverviewAction,
  getRecentAppConnectionsAction,
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

type Overview = Awaited<ReturnType<typeof getMobileAppOverviewAction>>;
type Trend = Awaited<ReturnType<typeof getAppConnectionTrendAction>>;
type Recent = Awaited<ReturnType<typeof getRecentAppConnectionsAction>>;
type Adoption = Awaited<ReturnType<typeof getCompanyAppAdoptionAction>>;

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("fr-FR");
}

function formatRelative(d: Date | string | null): string {
  if (!d) return "jamais";
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

export default function MobileAppPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trend, setTrend] = useState<Trend>([]);
  const [recent, setRecent] = useState<Recent>([]);
  const [adoption, setAdoption] = useState<Adoption>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ov, tr, rc, ad] = await Promise.all([
        getMobileAppOverviewAction(),
        getAppConnectionTrendAction(30),
        getRecentAppConnectionsAction(30),
        getCompanyAppAdoptionAction(50),
      ]);
      setOverview(ov);
      setTrend(tr);
      setRecent(rc);
      setAdoption(ad);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !overview) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">App mobile</h1>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const kpiCards = [
    {
      label: "Propriétaires connectés à l'app",
      value: fmt(overview.ownersConnected),
      sub: `sur ${fmt(overview.totalOwnerMemberships)} (${overview.ownerAdoptionRate}%)`,
      icon: LogIn,
      bg: "bg-blue-50",
      fg: "text-blue-600",
    },
    {
      label: "Employés connectés à l'app",
      value: fmt(overview.employeesConnected),
      sub: `sur ${fmt(overview.totalEmployees)} (${overview.employeeAdoptionRate}%)`,
      icon: UserCheck,
      bg: "bg-green-50",
      fg: "text-green-600",
    },
    {
      label: "Entreprises utilisant l'app",
      value: fmt(overview.companiesUsingApp),
      sub: `sur ${fmt(overview.totalCompanies)} (${overview.companyAdoptionRate}%)`,
      icon: Building2,
      bg: "bg-purple-50",
      fg: "text-purple-600",
    },
    {
      label: "Connexions app (7 jours)",
      value: fmt(overview.connections7d),
      sub: `${fmt(overview.connectionsToday)} aujourd'hui · ${fmt(overview.connections30d)} sur 30j`,
      icon: TrendingUp,
      bg: "bg-emerald-50",
      fg: "text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
          <Smartphone className="h-6 w-6 text-slate-400" />
          App mobile
        </h1>
        <p className="text-sm text-slate-500">
          Qui installe / se connecte à l&apos;application Android OControle
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-slate-500">{k.label}</p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{k.value}</p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-400">{k.sub}</p>
                </div>
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${k.bg}`}>
                  <k.icon className={`h-4 w-4 ${k.fg}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Trend chart */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            Connexions à l&apos;app (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="owners" name="Propriétaires" stroke="#3b82f6" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="employees" name="Employés" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent connections */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-indigo-500" />
              Dernières connexions à l&apos;app
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[460px] space-y-2 overflow-y-auto">
              {recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Aucune connexion à l&apos;app pour le moment
                </p>
              ) : (
                recent.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        r.role === "OWNER"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                          : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      }`}
                    >
                      {(r.name?.charAt(0) ?? "?").toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {r.name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${
                            r.role === "OWNER"
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-green-200 bg-green-50 text-green-700"
                          }`}
                        >
                          {r.role === "OWNER" ? "Propriétaire" : "Employé"}
                        </Badge>
                      </div>
                      <div className="truncate text-[11px] text-slate-400">
                        {r.companyName} · {r.contact ?? "—"}
                      </div>
                    </div>
                    <p className="shrink-0 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      {formatRelative(r.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Adoption by company */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Building2 className="h-4 w-4 text-orange-500" />
              Adoption par entreprise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[460px] space-y-2 overflow-y-auto">
              {adoption.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Aucune entreprise</p>
              ) : (
                adoption.map((c) => (
                  <div
                    key={c.companyId}
                    className="flex items-center justify-between rounded-lg p-2 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                        {c.companyName}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
                        {c.ownerConnectedApp ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <Circle className="h-3 w-3 text-slate-300" />
                        )}
                        Propriétaire {c.ownerConnectedApp ? formatRelative(c.ownerLastAppLoginAt) : "jamais connecté"}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {c.employeesConnected}/{c.totalEmployees} employés
                      </p>
                      <p className="text-[10px] text-slate-400">{c.employeeAdoptionRate}% adoption</p>
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
