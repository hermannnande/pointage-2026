"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Search, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { getCompaniesAction } from "../actions";

const SUB_BADGE: Record<string, { label: string; cls: string }> = {
  TRIALING: { label: "Essai", cls: "bg-blue-100 text-blue-700" },
  ACTIVE: { label: "Actif", cls: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "Impayé", cls: "bg-amber-100 text-amber-700" },
  GRACE_PERIOD: { label: "Grâce", cls: "bg-yellow-100 text-yellow-700" },
  CANCELLED: { label: "Annulé", cls: "bg-slate-100 text-slate-700" },
  EXPIRED: { label: "Expiré", cls: "bg-red-100 text-red-700" },
};

type Company = Awaited<ReturnType<typeof getCompaniesAction>>["data"][number];

export default function CompaniesPage() {
  const [data, setData] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize: 20 };
      if (search) filters.search = search;
      if (statusFilter !== "all") filters.status = statusFilter;
      if (subFilter !== "all") filters.subscription = subFilter;
      const res = await getCompaniesAction(filters as Parameters<typeof getCompaniesAction>[0]);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, subFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Entreprises</h1>
        <p className="text-sm text-slate-500">{total} entreprise{total > 1 ? "s" : ""} inscrite{total > 1 ? "s" : ""}</p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher par nom, email…"
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
              <SelectItem value="inactive">Inactif</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subFilter} onValueChange={(v) => { setSubFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Abonnement" /></SelectTrigger>
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
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-blue-500" />
            Liste des entreprises
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
          ) : data.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucune entreprise trouvée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Entreprise</th>
                    <th className="px-4 py-3">Pays</th>
                    <th className="px-4 py-3">Abonnement</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3 text-center">Employés</th>
                    <th className="px-4 py-3 text-center">Lieux</th>
                    <th className="px-4 py-3">Inscrit le</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((c) => {
                    const sub = SUB_BADGE[c.subStatus ?? ""] ?? { label: c.subStatus ?? "—", cls: "bg-slate-100 text-slate-600" };
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{c.name}</p>
                            <p className="text-xs text-slate-400">{c.email ?? "—"}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.country}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={sub.cls}>{sub.label}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{c.planName ?? "—"}</td>
                        <td className="px-4 py-3 text-center font-medium">{c.employeeCount}</td>
                        <td className="px-4 py-3 text-center font-medium">{c.siteCount}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</td>
                        <td className="px-4 py-3">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/super-admin/companies/${c.id}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-slate-500">Page {page} sur {totalPages} ({total} résultats)</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
