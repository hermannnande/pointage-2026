"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, Search, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import { getSuperAdminLogsAction } from "../actions";

type Log = Awaited<ReturnType<typeof getSuperAdminLogsAction>>["data"][number];

const ACTION_LABELS: Record<string, { label: string; cls: string }> = {
  SUSPEND_COMPANY: { label: "Suspension", cls: "bg-red-100 text-red-700" },
  REACTIVATE_COMPANY: { label: "Réactivation", cls: "bg-green-100 text-green-700" },
  EXTEND_TRIAL: { label: "Prolongation essai", cls: "bg-blue-100 text-blue-700" },
  CHANGE_PLAN: { label: "Changement plan", cls: "bg-purple-100 text-purple-700" },
  ADD_NOTE: { label: "Note ajoutée", cls: "bg-yellow-100 text-yellow-700" },
};

export default function LogsPage() {
  const [data, setData] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize: 20 };
      if (search) filters.search = search;
      if (actionFilter !== "all") filters.action = actionFilter;
      const res = await getSuperAdminLogsAction(filters as Parameters<typeof getSuperAdminLogsAction>[0]);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Journaux d&apos;administration</h1>
        <p className="text-sm text-slate-500">{total} action{total > 1 ? "s" : ""} enregistrée{total > 1 ? "s" : ""}</p>
      </div>

      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Rechercher dans les logs…" className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="SUSPEND_COMPANY">Suspension</SelectItem>
              <SelectItem value="REACTIVATE_COMPANY">Réactivation</SelectItem>
              <SelectItem value="EXTEND_TRIAL">Prolongation essai</SelectItem>
              <SelectItem value="CHANGE_PLAN">Changement plan</SelectItem>
              <SelectItem value="ADD_NOTE">Note ajoutée</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScrollText className="h-4 w-4 text-slate-500" />
            Historique des actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : data.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucun log trouvé</p>
          ) : (
            <div className="divide-y">
              {data.map((log) => {
                const cfg = ACTION_LABELS[log.action] ?? { label: log.action, cls: "bg-slate-100 text-slate-600" };
                return (
                  <div key={log.id} className="flex items-start gap-4 px-4 py-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <Shield className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{log.actor.fullName}</span>
                        <Badge variant="outline" className={`text-[10px] ${cfg.cls}`}>{cfg.label}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                        {log.targetName && <span className="font-medium">{log.targetName}</span>}
                        {log.oldValue && log.newValue && (
                          <span className="text-xs text-slate-400"> ({log.oldValue} → {log.newValue})</span>
                        )}
                        {log.comment && <span className="block text-xs italic text-slate-400">{log.comment}</span>}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                );
              })}
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
