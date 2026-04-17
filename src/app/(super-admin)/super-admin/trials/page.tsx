"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Search, ChevronLeft, ChevronRight, AlertTriangle, Clock, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TRIAL_DAYS } from "@/lib/constants";

import { getTrialsAction } from "../actions";

type Trial = Awaited<ReturnType<typeof getTrialsAction>>["data"][number];

export default function TrialsPage() {
  const [data, setData] = useState<Trial[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize: 20 };
      if (search) filters.search = search;
      if (statusFilter !== "all") filters.status = statusFilter;
      const res = await getTrialsAction(filters as Parameters<typeof getTrialsAction>[0]);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  function daysLabel(d: number) {
    if (d <= 0) return "Expiré";
    if (d === 1) return "1 jour";
    return `${d} jours`;
  }

  function daysColor(d: number) {
    if (d <= 0) return "bg-red-100 text-red-700";
    if (d <= 3) return "bg-amber-100 text-amber-700";
    return "bg-green-100 text-green-700";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Essais gratuits</h1>
          <p className="text-sm text-slate-500">{total} entreprise{total > 1 ? "s" : ""} avec essai</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300 sm:self-end">
          <Info className="h-3.5 w-3.5" />
          Durée d&apos;essai par défaut : <span className="font-bold">{TRIAL_DAYS} jour{TRIAL_DAYS > 1 ? "s" : ""}</span>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Rechercher…" className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Filtre" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Essai actif</SelectItem>
              <SelectItem value="expiring">Se termine bientôt</SelectItem>
              <SelectItem value="expired">Expiré</SelectItem>
              <SelectItem value="converted">Converti</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm"><FlaskConical className="h-4 w-4 text-blue-500" />Suivi des essais</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : data.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucun essai trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Entreprise</th>
                    <th className="px-4 py-3">Inscription</th>
                    <th className="px-4 py-3">Fin essai</th>
                    <th className="px-4 py-3">Jours restants</th>
                    <th className="px-4 py-3">Abonnement</th>
                    <th className="px-4 py-3 text-center">Employés</th>
                    <th className="px-4 py-3 text-center">Lieux</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.email ?? ""}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(t.createdAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{t.trialEndsAt ? new Date(t.trialEndsAt).toLocaleDateString("fr-FR") : "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={daysColor(t.daysLeft)}>
                          {t.daysLeft <= 0 ? <AlertTriangle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
                          {daysLabel(t.daysLeft)}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{t.subStatus ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center font-medium">{t.employeeCount}</td>
                      <td className="px-4 py-2.5 text-center font-medium">{t.siteCount}</td>
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
