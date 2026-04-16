"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle,
  Coffee,
  UserX,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { getLiveAttendanceAction, getSitesForFilterAction } from "./actions";

function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<string, { label: string; variant: string }> = {
  PRESENT: { label: "Présent", variant: "default" },
  LATE: { label: "En retard", variant: "secondary" },
  EARLY_DEPARTURE: { label: "Départ anticipé", variant: "secondary" },
  ABSENT: { label: "Absent", variant: "destructive" },
  HALF_DAY: { label: "Demi-journée", variant: "secondary" },
  ON_LEAVE: { label: "En congé", variant: "outline" },
  HOLIDAY: { label: "Jour férié", variant: "outline" },
  REST_DAY: { label: "Repos", variant: "outline" },
};

const ALL_SITES_VALUE = "__all__";
const PAGE_SIZE = 10;

type LivePayload = Awaited<ReturnType<typeof getLiveAttendanceAction>>;
type LiveRow = LivePayload["records"][number];
type SiteRow = Awaited<ReturnType<typeof getSitesForFilterAction>>[number];

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function statusBadgeVariant(status: string): BadgeVariant {
  const v = STATUS_LABELS[status]?.variant;
  if (
    v === "default" ||
    v === "secondary" ||
    v === "destructive" ||
    v === "outline"
  ) {
    return v;
  }
  return "outline";
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "PRESENT":
      return "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200";
    case "LATE":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    case "EARLY_DEPARTURE":
      return "border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-200";
    default:
      return "";
  }
}

export default function AttendanceLivePage() {
  const [siteId, setSiteId] = useState(ALL_SITES_VALUE);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [payload, setPayload] = useState<LivePayload | null>(null);

  const loadLive = useCallback(async () => {
    setLoading(true);
    try {
      const siteFilter =
        siteId === ALL_SITES_VALUE ? undefined : siteId || undefined;
      const data = await getLiveAttendanceAction(siteFilter);
      setPayload(data);
    } catch {
      toast.error("Impossible de charger le pointage en direct");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void loadLive();
  }, [loadLive]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadLive();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [loadLive]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSitesLoading(true);
      try {
        const data = await getSitesForFilterAction();
        if (!cancelled) setSites(data);
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les sites");
          setSites([]);
        }
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [siteId]);

  const records = payload?.records ?? [];
  const stats = payload?.stats;

  const total = records.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return records.slice(start, start + PAGE_SIZE);
  }, [records, page]);

  const columns = useMemo<ColumnDef<LiveRow>[]>(
    () => [
      {
        id: "employee",
        header: "Employé",
        cell: ({ row }) => {
          const e = row.original.employee;
          return (
            <span className="font-medium">
              {e.firstName} {e.lastName}
            </span>
          );
        },
      },
      {
        id: "site",
        header: "Site",
        cell: ({ row }) => row.original.site?.name ?? "—",
      },
      {
        id: "clockIn",
        header: "Entrée",
        cell: ({ row }) => {
          const r = row.original as LiveRow & { clockInAddress?: string | null };
          return (
            <div>
              <span>{fmtTime(r.clockIn)}</span>
              {r.clockInAddress && (
                <p className="truncate text-[11px] text-muted-foreground max-w-[180px]">
                  {r.clockInAddress}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "clockOut",
        header: "Sortie",
        cell: ({ row }) => {
          const r = row.original as LiveRow & { clockOutAddress?: string | null };
          return (
            <div>
              <span>{fmtTime(r.clockOut)}</span>
              {r.clockOutAddress && (
                <p className="truncate text-[11px] text-muted-foreground max-w-[180px]">
                  {r.clockOutAddress}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: "breaks",
        header: "Pauses",
        cell: ({ row }) => {
          const m = row.original.breakMinutes ?? 0;
          return m > 0 ? `${m} min` : "—";
        },
      },
      {
        id: "late",
        header: "Retard",
        cell: ({ row }) => {
          const r = row.original;
          if (!r.isLate) return "—";
          return (
            <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              {r.lateMinutes} min
            </Badge>
          );
        },
      },
      {
        id: "status",
        header: "Statut",
        cell: ({ row }) => {
          const s = row.original.status;
          const meta = STATUS_LABELS[s] ?? {
            label: s,
            variant: "outline",
          };
          return (
            <Badge
              variant={statusBadgeVariant(s)}
              className={cn(statusBadgeClass(s))}
            >
              {meta.label}
            </Badge>
          );
        },
      },
    ],
    [],
  );

  if (loading && !payload) {
    return (
      <>
        <PageHeader
          title="Pointage en direct"
          description="Voyez en temps réel qui a pointé aujourd'hui."
        >
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
        </PageHeader>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="mb-4 h-8 w-56" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Pointage en direct"
        description="Voyez en temps réel qui a pointé aujourd'hui."
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/attendance/history">Historique</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/attendance/kiosk">Kiosque</Link>
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-green-200/60 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-green-900 dark:text-green-200">
              Présents
            </p>
            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-green-900 dark:text-green-100">
            {stats?.present ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200/60 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              En pause
            </p>
            <Coffee className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-100">
            {stats?.onBreak ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-blue-200/60 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Terminés
            </p>
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-100">
            {stats?.completed ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-red-200/60 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/20">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-red-900 dark:text-red-200">
              Absents
            </p>
            <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-900 dark:text-red-100">
            {stats?.absent ?? 0}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Pointages du jour — mise à jour automatique toutes les 30 secondes
        </p>
        <Select
          value={siteId}
          onValueChange={(v: string | null, _details: any) =>
            setSiteId(v || ALL_SITES_VALUE)
          }
          disabled={sitesLoading}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue placeholder="Filtrer par site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SITES_VALUE}>Tous les sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={loading ? "pointer-events-none opacity-60" : ""}>
        <DataTable
          columns={columns}
          data={paginatedRecords}
          emptyMessage="Aucun pointage enregistré pour aujourd'hui."
        />
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </>
  );
}
