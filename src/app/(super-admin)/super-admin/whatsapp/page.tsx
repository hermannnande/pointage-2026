"use client";

// Messages WhatsApp — journal des messages automatiques envoyés via
// WasenderAPI : bienvenue, rappels d'essai, suivi des paiements.
// Qui a reçu quoi, quand, et si l'envoi a réussi.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock3,
  Search,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  FlaskConical,
  Wallet,
  ShoppingCart,
  RefreshCw,
  BellRing,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { getWhatsAppMessagesAction, getWhatsAppKPIsAction } from "../actions-v2";

const ResponsiveContainer = dynamic(() => import("recharts").then((m) => m.ResponsiveContainer), { ssr: false });
const BarChart = dynamic(() => import("recharts").then((m) => m.BarChart), { ssr: false });
const Bar = dynamic(() => import("recharts").then((m) => m.Bar), { ssr: false });
const XAxis = dynamic(() => import("recharts").then((m) => m.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then((m) => m.YAxis), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then((m) => m.Tooltip), { ssr: false });
const Legend = dynamic(() => import("recharts").then((m) => m.Legend), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then((m) => m.CartesianGrid), { ssr: false });

type Messages = Awaited<ReturnType<typeof getWhatsAppMessagesAction>>;
type KPIs = Awaited<ReturnType<typeof getWhatsAppKPIsAction>>;

const TYPE_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  welcome: {
    label: "Bienvenue",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    icon: UserPlus,
  },
  trial_reminder: {
    label: "Rappel essai",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    icon: FlaskConical,
  },
  trial_ended: {
    label: "Fin d'essai",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
    icon: BellRing,
  },
  payment_success: {
    label: "Paiement confirmé",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    icon: Wallet,
  },
  payment_failed: {
    label: "Paiement échoué",
    color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    icon: XCircle,
  },
  checkout_abandoned: {
    label: "Checkout abandonné",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400",
    icon: ShoppingCart,
  },
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  SENT: {
    label: "Envoyé",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  FAILED: {
    label: "Échoué",
    color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    icon: XCircle,
  },
  PENDING: {
    label: "En cours",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: Clock3,
  },
};

function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WhatsAppMessagesPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null);
  const [messages, setMessages] = useState<Messages | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "SENT" | "FAILED" | "PENDING">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(
    async (opts?: { keepKpis?: boolean }) => {
      const [msgs, k] = await Promise.all([
        getWhatsAppMessagesAction({
          type: typeFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
          page,
          pageSize: 30,
        }),
        opts?.keepKpis ? Promise.resolve(null) : getWhatsAppKPIsAction(),
      ]);
      setMessages(msgs);
      if (k) setKpis(k);
    },
    [typeFilter, statusFilter, search, page],
  );

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rechargement quand filtres / page changent (après le premier rendu).
  useEffect(() => {
    if (loading) return;
    setRefreshing(true);
    void load({ keepKpis: true }).finally(() => setRefreshing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, page]);

  const submitSearch = () => {
    setPage(1);
    setRefreshing(true);
    void load({ keepKpis: true }).finally(() => setRefreshing(false));
  };

  if (loading || !kpis || !messages) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            <MessageCircle className="h-6 w-6 text-green-500" />
            Messages WhatsApp
          </h1>
          <p className="text-sm text-slate-500">
            Messages automatiques envoyés via WasenderAPI — bienvenue, essais, paiements
          </p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            void load().finally(() => setRefreshing(false));
          }}
          className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-500 shadow-sm transition-colors hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:hover:text-white"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
          Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Messages envoyés (total)", value: kpis.total, icon: MessageCircle, color: "text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400" },
          { label: "Envoyés aujourd'hui", value: kpis.sentToday, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" },
          { label: "Envoyés (7 jours)", value: kpis.sent7d, icon: BellRing, color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" },
          { label: "Échecs (30 jours)", value: kpis.failed30d, icon: XCircle, color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400" },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium text-slate-500">{k.label}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                  {k.value.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", k.color)}>
                <k.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Tendance */}
        <Card className="border-0 shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Envois par jour (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={kpis.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f033" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} interval="preserveStartEnd" tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={28} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="envoyes" name="Envoyés" stackId="a" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="echoues" name="Échoués" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Répartition par type */}
        <Card className="border-0 shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Par type de message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {kpis.byType.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Aucun message envoyé pour l&apos;instant</p>
            ) : (
              kpis.byType
                .sort((a, b) => b.count - a.count)
                .map((t) => {
                  const meta = TYPE_META[t.type] ?? {
                    label: t.type,
                    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    icon: MessageCircle,
                  };
                  return (
                    <button
                      key={t.type}
                      onClick={() => {
                        setTypeFilter(typeFilter === t.type ? "" : t.type);
                        setPage(1);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2.5 transition-all hover:shadow-md",
                        typeFilter === t.type
                          ? "border-slate-900 dark:border-white"
                          : "border-slate-200 dark:border-slate-800",
                      )}
                    >
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.color)}>
                        <meta.icon className="h-3 w-3" />
                        {meta.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{t.count}</span>
                    </button>
                  );
                })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold">
              Historique ({messages.total.toLocaleString("fr-FR")})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submitSearch()}
                  placeholder="Téléphone ou contenu…"
                  className="h-8 w-56 pl-8 text-xs"
                />
              </div>
              <div className="flex gap-1">
                {(
                  [
                    { key: "", label: "Tous" },
                    { key: "SENT", label: "Envoyés" },
                    { key: "FAILED", label: "Échoués" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => {
                      setStatusFilter(f.key);
                      setPage(1);
                    }}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                      statusFilter === f.key
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
        <CardContent className={cn("overflow-x-auto", refreshing && "opacity-60")}>
          {messages.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Aucun message ne correspond</p>
          ) : (
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th className="pb-2 pr-3 font-semibold">Date</th>
                  <th className="pb-2 pr-3 font-semibold">Type</th>
                  <th className="pb-2 pr-3 font-semibold">Destinataire</th>
                  <th className="pb-2 pr-3 font-semibold">Entreprise</th>
                  <th className="pb-2 pr-3 font-semibold">Statut</th>
                  <th className="pb-2 font-semibold">Message</th>
                </tr>
              </thead>
              <tbody>
                {messages.data.map((m) => {
                  const typeMeta = TYPE_META[m.type] ?? {
                    label: m.type,
                    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    icon: MessageCircle,
                  };
                  const statusMeta = STATUS_META[m.status] ?? STATUS_META.PENDING;
                  const isOpen = expanded === m.id;
                  return (
                    <tr
                      key={m.id}
                      className="cursor-pointer border-b border-slate-100 align-top hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/40"
                      onClick={() => setExpanded(isOpen ? null : m.id)}
                    >
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-500">{fmtDateTime(m.createdAt)}</td>
                      <td className="py-2.5 pr-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap", typeMeta.color)}>
                          <typeMeta.icon className="h-3 w-3" />
                          {typeMeta.label}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{m.userName ?? "—"}</p>
                        <p className="text-[10px] text-slate-400">{m.phone}</p>
                      </td>
                      <td className="py-2.5 pr-3">
                        {m.companyId ? (
                          <Link
                            href={`/super-admin/companies/${m.companyId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {m.companyName ?? "Voir"}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", statusMeta.color)}>
                          <statusMeta.icon className="h-3 w-3" />
                          {statusMeta.label}
                        </span>
                        {m.error && isOpen && (
                          <p className="mt-1 max-w-[180px] text-[10px] leading-snug text-red-500">{m.error}</p>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-600 dark:text-slate-400">
                        <p className={cn("whitespace-pre-line", !isOpen && "line-clamp-2 max-w-md")}>{m.content}</p>
                        {!isOpen && m.content.length > 120 && (
                          <span className="text-[10px] text-blue-500">Cliquer pour tout voir</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {messages.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                Page {messages.page} / {messages.totalPages}
              </p>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  disabled={page >= messages.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-800 dark:hover:bg-slate-800"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
