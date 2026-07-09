"use client";

// Inscriptions & blocages — où chaque entreprise inscrite est bloquée
// dans son onboarding (aucun lieu / aucun employé / aucun pointage /
// pas de paiement), avec contact du propriétaire pour la relancer.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  UserPlus,
  CheckCircle2,
  FlaskConical,
  AlertTriangle,
  MapPin,
  Users,
  Clock,
  CreditCard,
  Search,
  Smartphone,
  Phone,
  Mail,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { getSignupAnalysisAction } from "../actions-v2";
import type { OnboardingStage } from "@/services/super-admin-analytics.service";

type Analysis = Awaited<ReturnType<typeof getSignupAnalysisAction>>;

const DAYS_OPTIONS = [
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
  { value: 180, label: "6 mois" },
  { value: 365, label: "12 mois" },
];

const STAGE_META: Record<
  OnboardingStage,
  { label: string; short: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  SITE: {
    label: "Bloqué : aucun lieu créé",
    short: "Aucun lieu",
    color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    icon: MapPin,
  },
  EMPLOYEE: {
    label: "Bloqué : aucun employé",
    short: "Aucun employé",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
    icon: Users,
  },
  CLOCKING: {
    label: "Bloqué : aucun pointage",
    short: "Aucun pointage",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    icon: Clock,
  },
  PAYMENT: {
    label: "Bloqué : pas de paiement",
    short: "Pas de paiement",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
    icon: CreditCard,
  },
  TRIAL: {
    label: "En essai actif",
    short: "En essai",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    icon: FlaskConical,
  },
  ACTIVE: {
    label: "Convertie (abonnement payé)",
    short: "Convertie",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    icon: CheckCircle2,
  },
};

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function SignupsPage() {
  const [days, setDays] = useState(90);
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState<OnboardingStage | "ALL" | "BLOCKED">("ALL");
  const [search, setSearch] = useState("");

  const load = useCallback(async (d: number) => {
    setLoading(true);
    try {
      setData(await getSignupAnalysisAction(d));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(days);
  }, [days, load]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.companies;
    if (stageFilter === "BLOCKED") rows = rows.filter((r) => r.isBlocked);
    else if (stageFilter !== "ALL") rows = rows.filter((r) => r.stage === stageFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.ownerName ?? "").toLowerCase().includes(q) ||
          (r.ownerEmail ?? "").toLowerCase().includes(q) ||
          (r.ownerPhone ?? "").includes(q),
      );
    }
    return rows;
  }, [data, stageFilter, search]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const maxFunnel = Math.max(1, ...data.funnel.map((f) => f.count));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <UserPlus className="h-6 w-6 text-blue-500" />
            Inscriptions &amp; blocages
          </h1>
          <p className="text-sm text-slate-500">
            Où chaque entreprise inscrite est bloquée dans son parcours — et qui relancer
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {DAYS_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => setDays(o.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                days === o.value
                  ? "bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Inscriptions", value: data.total, icon: UserPlus, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" },
          { label: "Converties (payé)", value: data.converted, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" },
          { label: "En essai actif", value: data.inTrial, icon: FlaskConical, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 dark:text-indigo-400" },
          { label: "Bloquées", value: data.blocked, icon: AlertTriangle, color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400" },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{k.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", k.color)}>
                <k.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Funnel d&apos;onboarding ({days} derniers jours)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.funnel.map((f, i) => (
              <div key={f.step}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {i + 1}. {f.step}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {f.count} <span className="font-normal text-slate-400">({f.pct}%)</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      i === data.funnel.length - 1 ? "bg-emerald-500" : "bg-blue-500",
                    )}
                    style={{ width: `${Math.round((f.count / maxFunnel) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Répartition des blocages */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Où sont-elles bloquées ?</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {data.blockedBreakdown.map((b) => {
              const meta = STAGE_META[b.stage];
              return (
                <button
                  key={b.stage}
                  onClick={() => setStageFilter(stageFilter === b.stage ? "ALL" : b.stage)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-md",
                    stageFilter === b.stage
                      ? "border-slate-900 dark:border-white"
                      : "border-slate-200 dark:border-slate-800",
                  )}
                >
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", meta.color)}>
                    <meta.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-tight text-slate-900 dark:text-white">{b.count}</p>
                    <p className="truncate text-[11px] text-slate-500">{meta.short}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">
              Entreprises ({filtered.length})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher…"
                  className="h-8 w-52 pl-8 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    { key: "ALL", label: "Toutes" },
                    { key: "BLOCKED", label: "Bloquées" },
                    { key: "TRIAL", label: "En essai" },
                    { key: "ACTIVE", label: "Converties" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStageFilter(f.key)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      stageFilter === f.key
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Aucune entreprise ne correspond</p>
          ) : (
            <table className="w-full min-w-[960px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="pb-2 pr-3 font-semibold">Entreprise</th>
                  <th className="pb-2 pr-3 font-semibold">Statut</th>
                  <th className="pb-2 pr-3 font-semibold">Inscrite</th>
                  <th className="pb-2 pr-3 font-semibold">Parcours</th>
                  <th className="pb-2 pr-3 font-semibold">App</th>
                  <th className="pb-2 pr-3 font-semibold">Propriétaire</th>
                  <th className="pb-2 font-semibold">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const meta = STAGE_META[r.stage];
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/super-admin/companies/${r.id}`}
                          className="group inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600 dark:text-white"
                        >
                          {r.name}
                          <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                        <p className="text-[10px] text-slate-400">
                          {r.city ? `${r.city}, ` : ""}
                          {r.country}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.color)}>
                          <meta.icon className="h-3 w-3" />
                          {meta.short}
                        </span>
                        {r.stage === "TRIAL" && r.trialDaysLeft != null && (
                          <p className="mt-0.5 text-[10px] text-slate-400">{r.trialDaysLeft} j restants</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">
                        {fmtDate(r.createdAt)}
                        <p className="text-[10px] text-slate-400">il y a {r.daysSinceSignup} j</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span title="Lieux" className={cn(r.sitesCount === 0 && "text-red-500 font-semibold")}>
                            {r.sitesCount} lieu(x)
                          </span>
                          <span>·</span>
                          <span title="Employés" className={cn(r.employeesCount === 0 && "text-red-500 font-semibold")}>
                            {r.employeesCount} emp.
                          </span>
                          <span>·</span>
                          <span title="Pointages" className={cn(r.clockingsTotal === 0 && "text-red-500 font-semibold")}>
                            {r.clockingsTotal} ptg
                          </span>
                        </div>
                        {r.lastClockAt && (
                          <p className="text-[10px] text-slate-400">Dernier pointage : {fmtDate(r.lastClockAt)}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Smartphone
                          className={cn("h-4 w-4", r.appConnected ? "text-emerald-500" : "text-slate-300 dark:text-slate-700")}
                        />
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-slate-700 dark:text-slate-300">{r.ownerName ?? "—"}</p>
                        {r.ownerLastLoginAt && (
                          <p className="text-[10px] text-slate-400">
                            Vu le {fmtDate(r.ownerLastLoginAt)}
                          </p>
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {r.ownerEmail && (
                            <a
                              href={`mailto:${r.ownerEmail}`}
                              className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400"
                            >
                              <Mail className="h-3 w-3" />
                              {r.ownerEmail}
                            </a>
                          )}
                          {r.ownerPhone && (
                            <a
                              href={`tel:${r.ownerPhone}`}
                              className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:underline"
                            >
                              <Phone className="h-3 w-3" />
                              {r.ownerPhone}
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
