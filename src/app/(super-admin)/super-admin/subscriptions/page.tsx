"use client";

import { useCallback, useEffect, useState } from "react";
import { CreditCard, Search, ChevronLeft, ChevronRight, DollarSign, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { getSubscriptionsAction, getSubscriptionKPIsAction } from "../actions";

const SUB_BADGE: Record<string, { label: string; cls: string }> = {
  TRIALING: { label: "Essai", cls: "bg-blue-100 text-blue-700" },
  ACTIVE: { label: "Actif", cls: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "Impayé", cls: "bg-amber-100 text-amber-700" },
  GRACE_PERIOD: { label: "Grâce", cls: "bg-yellow-100 text-yellow-700" },
  CANCELLED: { label: "Annulé", cls: "bg-slate-100 text-slate-700" },
  EXPIRED: { label: "Expiré", cls: "bg-red-100 text-red-700" },
};

type Sub = Awaited<ReturnType<typeof getSubscriptionsAction>>["data"][number];
type KPIs = Awaited<ReturnType<typeof getSubscriptionKPIsAction>>;

export default function SubscriptionsPage() {
  const [data, setData] = useState<Sub[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kpis, setKpis] = useState<KPIs | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize: 20 };
      if (search) filters.search = search;
      if (statusFilter !== "all") filters.status = statusFilter;
      const [res, k] = await Promise.all([
        getSubscriptionsAction(filters as Parameters<typeof getSubscriptionsAction>[0]),
        getSubscriptionKPIsAction(),
      ]);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setKpis(k);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Abonnements</h1>
        <p className="text-sm text-slate-500">{total} abonnement{total > 1 ? "s" : ""}</p>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card className="border-0 shadow-sm"><CardContent className="flex items-center gap-3 p-4">
            <CreditCard className="h-5 w-5 text-green-500" />
            <div><p className="text-xs text-slate-500">Actifs</p><p className="text-xl font-bold">{kpis.activeCount}</p></div>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            <div><p className="text-xs text-slate-500">MRR estimé</p><p className="text-xl font-bold">{kpis.mrrEstimate.toLocaleString("fr-FR")} XOF</p></div>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="flex items-center gap-3 p-4">
            <DollarSign className="h-5 w-5 text-purple-500" />
            <div><p className="text-xs text-slate-500">Revenu total</p><p className="text-xl font-bold">{kpis.totalRevenue.toLocaleString("fr-FR")} XOF</p></div>
          </CardContent></Card>
          <Card className="border-0 shadow-sm"><CardContent className="flex items-center gap-3 p-4">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            <div><p className="text-xs text-slate-500">Par plan</p>
              <div className="flex flex-wrap gap-1 mt-1">{kpis.byPlan.map((p) => (
                <Badge key={p.plan} variant="outline" className="text-[10px]">{p.plan}: {p.count}</Badge>
              ))}</div>
            </div>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Rechercher par entreprise…" className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="TRIALING">Essai</SelectItem>
              <SelectItem value="ACTIVE">Actif</SelectItem>
              <SelectItem value="PAST_DUE">Impayé</SelectItem>
              <SelectItem value="EXPIRED">Expiré</SelectItem>
              <SelectItem value="CANCELLED">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : data.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucun abonnement trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Entreprise</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Cycle</th>
                    <th className="px-4 py-3">Début</th>
                    <th className="px-4 py-3">Fin période</th>
                    <th className="px-4 py-3">Essai fin</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((s) => {
                    const badge = SUB_BADGE[s.status] ?? { label: s.status, cls: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{s.company.name}</p>
                          <p className="text-xs text-slate-400">{s.company.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{s.plan?.name ?? "—"}</td>
                        <td className="px-4 py-2.5"><Badge variant="outline" className={badge.cls}>{badge.label}</Badge></td>
                        <td className="px-4 py-2.5 text-slate-500">{s.billingCycle}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{s.currentPeriodStart ? new Date(s.currentPeriodStart).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString("fr-FR") : "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{s.trialEndsAt ? new Date(s.trialEndsAt).toLocaleDateString("fr-FR") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-slate-500">Page {page}/{totalPages} ({total})</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
