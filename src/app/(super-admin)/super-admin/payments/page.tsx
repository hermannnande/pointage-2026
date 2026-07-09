"use client";

// Analyse paiements — pourquoi les paiements échouent : échecs opérateur,
// checkouts abandonnés, renouvellements impayés, essais non convertis.
// Avec contact du propriétaire pour relancer, et liste des entreprises
// prioritaires (plusieurs échecs, jamais aucun paiement réussi).

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  AlertTriangle,
  XCircle,
  CheckCircle2,
  ShoppingCart,
  Wallet,
  TrendingDown,
  Flame,
  Mail,
  Phone,
  ExternalLink,
  HandCoins,
  Timer,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { getPaymentAnalysisAction } from "../actions-v2";
import type { PaymentIssueReason } from "@/services/super-admin-analytics.service";

const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const ComposedChart = dynamic(() => import("recharts").then((m) => m.ComposedChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const Line = dynamic(() => import("recharts").then((m) => m.Line), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });

type Analysis = Awaited<ReturnType<typeof getPaymentAnalysisAction>>;

const REASON_META: Record<
  PaymentIssueReason,
  { label: string; explain: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  OPERATOR_FAILED: {
    label: "Échec opérateur",
    explain: "Le paiement mobile money a été rejeté par l'opérateur (solde insuffisant, PIN erroné, timeout réseau…). Webhook sale.failed reçu de Chariow.",
    color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    icon: XCircle,
  },
  CHECKOUT_ABANDONED: {
    label: "Checkout abandonné",
    explain: "Le client a démarré le paiement mais n'a jamais complété : page fermée, hésitation sur le prix, ou problème au moment de valider sur son téléphone.",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    icon: ShoppingCart,
  },
  RENEWAL_UNPAID: {
    label: "Renouvellement impayé",
    explain: "L'abonnement est arrivé à échéance et le renouvellement n'a pas été payé (statut PAST_DUE / période de grâce en cours).",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
    icon: Timer,
  },
  TRIAL_NOT_CONVERTED: {
    label: "Essai non converti",
    explain: "L'essai gratuit est terminé mais l'entreprise n'a jamais tenté de payer. À relancer commercialement.",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
    icon: HandCoins,
  },
};

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString("fr-FR");
}
function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function PaymentsAnalysisPage() {
  const [data, setData] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reasonFilter, setReasonFilter] = useState<PaymentIssueReason | "ALL">("ALL");

  const load = useCallback(async () => {
    try {
      setData(await getPaymentAnalysisAction(90));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredIssues = useMemo(() => {
    if (!data) return [];
    if (reasonFilter === "ALL") return data.issues;
    return data.issues.filter((i) => i.reason === reasonFilter);
  }, [data, reasonFilter]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const { kpis } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Analyse paiements
          </h1>
          <p className="text-sm text-slate-500">
            Pourquoi les paiements échouent — et qui relancer en priorité (90 derniers jours)
          </p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            void load();
          }}
          className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 shadow-sm transition-colors hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:hover:text-white"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {/* KPIs 30j */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Paiements réussis (30j)", value: fmt(kpis.success30), icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" },
          { label: "Échecs opérateur (30j)", value: fmt(kpis.failed30), icon: XCircle, color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400" },
          { label: "Checkouts abandonnés (30j)", value: fmt(kpis.abandoned30), icon: ShoppingCart, color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400" },
          { label: "Taux d'échec", value: `${kpis.failureRate}%`, icon: TrendingDown, color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400" },
          { label: "Revenus encaissés (30j)", value: `${fmt(kpis.revenue30)} F`, icon: Wallet, color: "text-teal-600 bg-teal-50 dark:bg-teal-500/10 dark:text-teal-400" },
          { label: "Manque à gagner (30j)", value: `${fmt(kpis.lostRevenue30)} F`, icon: Flame, color: "text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400" },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg", k.color)}>
                <k.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{k.value}</p>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-500">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tendance 30 jours */}
        <Card className="border-0 shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Succès vs échecs vs checkouts démarrés (30j)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="succes" name="Réussis" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="echecs" name="Échoués" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="demarres" name="Checkouts démarrés" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Raisons d'échec */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pourquoi ça échoue ?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.reasonBreakdown.map((r) => {
              const meta = REASON_META[r.reason];
              return (
                <button
                  key={r.reason}
                  onClick={() => setReasonFilter(reasonFilter === r.reason ? "ALL" : r.reason)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all hover:shadow-md",
                    reasonFilter === r.reason
                      ? "border-slate-900 dark:border-white"
                      : "border-slate-200 dark:border-slate-800",
                  )}
                  title={meta.explain}
                >
                  <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.color)}>
                    <meta.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{meta.label}</p>
                      <p className="text-base font-bold text-slate-900 dark:text-white">{r.count}</p>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-slate-500">{meta.explain}</p>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Entreprises prioritaires */}
      {data.priorityCompanies.length > 0 && (
        <Card className="border-0 shadow-sm ring-1 ring-red-200 dark:ring-red-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-400">
              <Flame className="h-4 w-4" />
              À relancer en priorité — plusieurs tentatives, jamais aucun paiement réussi
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 md:grid-cols-2">
            {data.priorityCompanies.map((c) => (
              <div
                key={c.companyId}
                className="flex items-center justify-between gap-3 rounded-xl bg-red-50/60 p-3 dark:bg-red-500/5"
              >
                <div className="min-w-0">
                  <Link
                    href={`/super-admin/companies/${c.companyId}`}
                    className="text-sm font-semibold text-slate-900 hover:text-red-600 dark:text-white"
                  >
                    {c.companyName}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    {c.failureCount} tentative(s) échouée(s)
                    {c.planName ? ` · Plan ${c.planName}` : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {c.ownerEmail && (
                      <a href={`mailto:${c.ownerEmail}`} className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400">
                        <Mail className="h-3 w-3" /> {c.ownerEmail}
                      </a>
                    )}
                    {c.ownerPhone && (
                      <a href={`tel:${c.ownerPhone}`} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:underline">
                        <Phone className="h-3 w-3" /> {c.ownerPhone}
                      </a>
                    )}
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/15 dark:text-red-400">
                  ×{c.failureCount}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Liste détaillée */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">
              Problèmes de paiement ({filteredIssues.length})
            </CardTitle>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setReasonFilter("ALL")}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                  reasonFilter === "ALL"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                Tous
              </button>
              {(Object.keys(REASON_META) as PaymentIssueReason[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setReasonFilter(r)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                    reasonFilter === r
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400",
                  )}
                >
                  {REASON_META[r].label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {filteredIssues.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Aucun problème de paiement sur la période 🎉
            </p>
          ) : (
            <table className="w-full min-w-[920px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="pb-2 pr-3 font-semibold">Date</th>
                  <th className="pb-2 pr-3 font-semibold">Raison</th>
                  <th className="pb-2 pr-3 font-semibold">Entreprise</th>
                  <th className="pb-2 pr-3 font-semibold">Plan</th>
                  <th className="pb-2 pr-3 font-semibold">Montant</th>
                  <th className="pb-2 pr-3 font-semibold">Vente Chariow</th>
                  <th className="pb-2 font-semibold">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.map((i) => {
                  const meta = REASON_META[i.reason];
                  return (
                    <tr
                      key={i.id}
                      className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 pr-3 text-slate-500">{fmtDate(i.occurredAt)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.color)}>
                          <meta.icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Link
                          href={`/super-admin/companies/${i.companyId}`}
                          className="group inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-blue-600 dark:text-white"
                        >
                          {i.companyName}
                          <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                        {i.ownerName && <p className="text-[10px] text-slate-400">{i.ownerName}</p>}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-500">
                        {i.planName ?? "—"}
                        {i.billingCycle && (
                          <span className="text-[10px] text-slate-400">
                            {" "}
                            ({i.billingCycle === "YEARLY" ? "annuel" : "mensuel"})
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-slate-700 dark:text-slate-300">
                        {i.amount != null ? `${i.amount.toLocaleString("fr-FR")} ${i.currency}` : "—"}
                      </td>
                      <td className="py-2.5 pr-3">
                        {i.chariowSaleId ? (
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            {i.chariowSaleId.slice(0, 14)}…
                          </code>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-col gap-0.5">
                          {i.ownerEmail && (
                            <a href={`mailto:${i.ownerEmail}`} className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline dark:text-blue-400">
                              <Mail className="h-3 w-3" />
                              {i.ownerEmail}
                            </a>
                          )}
                          {i.ownerPhone && (
                            <a href={`tel:${i.ownerPhone}`} className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:underline">
                              <Phone className="h-3 w-3" />
                              {i.ownerPhone}
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
