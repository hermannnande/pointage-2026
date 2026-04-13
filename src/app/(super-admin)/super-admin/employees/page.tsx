"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Search, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { getGlobalEmployeesAction, getEmployeeGrowthAction } from "../actions";

type Employee = Awaited<ReturnType<typeof getGlobalEmployeesAction>>["data"][number];

export default function EmployeesPage() {
  const [data, setData] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [growth, setGrowth] = useState({ newToday: 0, newWeek: 0, newMonth: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize: 20 };
      if (search) filters.search = search;
      if (statusFilter !== "all") filters.status = statusFilter;
      const [res, g] = await Promise.all([
        getGlobalEmployeesAction(filters as Parameters<typeof getGlobalEmployeesAction>[0]),
        getEmployeeGrowthAction(),
      ]);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setGrowth(g);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employés plateforme</h1>
        <p className="text-sm text-slate-500">{total} employé{total > 1 ? "s" : ""} au total</p>
      </div>

      {/* Growth KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Aujourd'hui", value: growth.newToday },
          { label: "Cette semaine", value: growth.newWeek },
          { label: "Ce mois", value: growth.newMonth },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-slate-500">Nouveaux {k.label.toLowerCase()}</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">+{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Rechercher un employé…" className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm"><Users className="h-4 w-4 text-green-500" />Liste globale</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : data.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucun employé trouvé</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Entreprise</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Poste</th>
                    <th className="px-4 py-3">Contrat</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3">Ajouté le</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{e.firstName} {e.lastName}</p>
                        <p className="text-xs text-slate-400">{e.matricule}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{e.company.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.site?.name ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.position ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.contractType ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={e.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                          {e.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(e.createdAt).toLocaleDateString("fr-FR")}</td>
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
