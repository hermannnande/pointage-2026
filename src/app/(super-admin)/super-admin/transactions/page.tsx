"use client";

import { useCallback, useEffect, useState } from "react";
import { Receipt, Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { getTransactionsAction, getTransactionKPIsAction } from "../actions";

type Tx = Awaited<ReturnType<typeof getTransactionsAction>>["data"][number];
type KPIs = Awaited<ReturnType<typeof getTransactionKPIsAction>>;

export default function TransactionsPage() {
  const [data, setData] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [kpis, setKpis] = useState<KPIs | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize: 20 };
      if (search) filters.search = search;
      if (typeFilter !== "all") filters.type = typeFilter;
      const [res, k] = await Promise.all([
        getTransactionsAction(filters as Parameters<typeof getTransactionsAction>[0]),
        getTransactionKPIsAction(),
      ]);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setKpis(k);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <p className="text-sm text-slate-500">{total} transaction{total > 1 ? "s" : ""}</p>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total tx", value: kpis.totalTx, icon: Receipt, color: "text-blue-500" },
            { label: "Réussies", value: kpis.successTotal, icon: CheckCircle, color: "text-green-500" },
            { label: "Échouées", value: kpis.failedTotal, icon: XCircle, color: "text-red-500" },
            { label: "CA jour", value: `${kpis.revenueToday.toLocaleString("fr-FR")}`, icon: DollarSign, color: "text-amber-500" },
            { label: "CA mois", value: `${kpis.revenueMonth.toLocaleString("fr-FR")}`, icon: DollarSign, color: "text-emerald-500" },
            { label: "CA total", value: `${kpis.revenueAll.toLocaleString("fr-FR")}`, icon: DollarSign, color: "text-purple-500" },
          ].map((k) => (
            <Card key={k.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <k.icon className={`h-5 w-5 ${k.color}`} />
                <div>
                  <p className="text-[10px] text-slate-500">{k.label}</p>
                  <p className="text-lg font-bold">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Rechercher par entreprise…" className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="payment_success">Réussi</SelectItem>
              <SelectItem value="payment_failed">Échoué</SelectItem>
              <SelectItem value="payment_initiated">Initié</SelectItem>
              <SelectItem value="subscription_created">Abonnement créé</SelectItem>
              <SelectItem value="subscription_cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : data.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucune transaction</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Entreprise</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{tx.id.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5 font-medium">{tx.company.name}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={
                          tx.type === "payment_success" ? "bg-green-50 text-green-700"
                            : tx.type === "payment_failed" ? "bg-red-50 text-red-700"
                              : "bg-slate-50 text-slate-600"
                        }>{tx.type}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{tx.amount ? `${tx.amount.toLocaleString("fr-FR")} ${tx.currency ?? "XOF"}` : "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{tx.chariowSaleId ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString("fr-FR")}</td>
                    </tr>
                  ))}
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
