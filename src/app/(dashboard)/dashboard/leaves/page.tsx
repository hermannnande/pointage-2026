"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, ListChecks, Tag } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  getLeaveRequestsAction,
  getPendingLeaveRequestsAction,
  cancelLeaveRequestAction,
  reviewLeaveRequestAction,
} from "./actions";

const ALL_STATUS = "__all__";

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className?: string;
  }
> = {
  PENDING: {
    label: "En attente",
    variant: "secondary",
    className:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  },
  APPROVED: {
    label: "Approuvé",
    variant: "default",
    className:
      "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-200",
  },
  REJECTED: { label: "Rejeté", variant: "destructive" },
  CANCELLED: { label: "Annulé", variant: "outline" },
};

type LeaveRequestsPayload = Awaited<ReturnType<typeof getLeaveRequestsAction>>;
type LeaveRequestRow = LeaveRequestsPayload["requests"][number];
type PendingRow = Awaited<
  ReturnType<typeof getPendingLeaveRequestsAction>
>[number];

function formatDateFR(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function LeavesPage() {
  const [mainTab, setMainTab] = useState<"demandes" | "attente">("demandes");
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<LeaveRequestsPayload | null>(null);

  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingList, setPendingList] = useState<PendingRow[]>([]);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getLeaveRequestsAction({
        page,
        ...(statusFilter !== ALL_STATUS ? { status: statusFilter } : {}),
      });
      setPayload(data);
    } catch {
      toast.error("Impossible de charger les demandes de congé");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (mainTab === "demandes") void loadRequests();
  }, [mainTab, loadRequests]);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const data = await getPendingLeaveRequestsAction();
      setPendingList(data);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Erreur lors du chargement";
      setPendingError(msg);
      setPendingList([]);
      toast.error("Impossible de charger les demandes en attente");
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === "attente") void loadPending();
  }, [mainTab, loadPending]);

  const handleCancel = useCallback(async (requestId: string) => {
    if (
      !window.confirm(
        "Annuler cette demande de congé ? Cette action est définitive pour une demande en attente.",
      )
    ) {
      return;
    }
    setActionId(requestId);
    try {
      const res = await cancelLeaveRequestAction(requestId);
      if (res.success) {
        toast.success("Demande annulée");
        void loadRequests();
      } else {
        toast.error(res.error ?? "Échec de l’annulation");
      }
    } finally {
      setActionId(null);
    }
  }, [loadRequests]);

  const handleApprove = useCallback(async (requestId: string) => {
    setActionId(requestId);
    try {
      const res = await reviewLeaveRequestAction({
        requestId,
        status: "APPROVED",
      });
      if (res.success) {
        toast.success("Demande approuvée");
        setRejectingId(null);
        setRejectNote("");
        void loadPending();
        void loadRequests();
      } else {
        toast.error(res.error ?? "Échec de l’approbation");
      }
    } finally {
      setActionId(null);
    }
  }, [loadPending, loadRequests]);

  const handleRejectConfirm = useCallback(async (requestId: string) => {
    setActionId(requestId);
    try {
      const res = await reviewLeaveRequestAction({
        requestId,
        status: "REJECTED",
        reviewNote: rejectNote.trim() || undefined,
      });
      if (res.success) {
        toast.success("Demande rejetée");
        setRejectingId(null);
        setRejectNote("");
        void loadPending();
        void loadRequests();
      } else {
        toast.error(res.error ?? "Échec du rejet");
      }
    } finally {
      setActionId(null);
    }
  }, [loadPending, loadRequests, rejectNote]);

  const columns = useMemo<ColumnDef<LeaveRequestRow>[]>(
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
        id: "type",
        header: "Type",
        cell: ({ row }) => {
          const lt = row.original.leaveType;
          return (
            <div className="flex items-center gap-2">
              <span
                className="inline-block size-2 shrink-0 rounded-full ring-1 ring-border"
                style={{ backgroundColor: lt.color }}
                aria-hidden
              />
              <span>{lt.name}</span>
            </div>
          );
        },
      },
      {
        id: "start",
        header: "Début",
        cell: ({ row }) => formatDateFR(row.original.startDate),
      },
      {
        id: "end",
        header: "Fin",
        cell: ({ row }) => formatDateFR(row.original.endDate),
      },
      {
        accessorKey: "totalDays",
        header: "Jours",
        cell: ({ row }) => row.original.totalDays,
      },
      {
        id: "status",
        header: "Statut",
        cell: ({ row }) => {
          const cfg =
            STATUS_CONFIG[row.original.status] ?? STATUS_CONFIG.PENDING;
          return (
            <Badge variant={cfg.variant} className={cn(cfg.className)}>
              {cfg.label}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          if (row.original.status !== "PENDING") return "—";
          return (
            <Button
              variant="outline"
              size="sm"
              disabled={actionId === row.original.id}
              onClick={() => void handleCancel(row.original.id)}
            >
              Annuler
            </Button>
          );
        },
      },
    ],
    [actionId, handleCancel],
  );

  const requests = payload?.requests ?? [];
  const total = payload?.total ?? 0;
  const totalPages = Math.max(1, payload?.totalPages ?? 1);
  const pageSize = payload?.pageSize ?? 25;
  const currentPage = payload?.page ?? page;

  if (loading && !payload && mainTab === "demandes") {
    return (
      <>
        <PageHeader
          title="Congés"
          description="Demandes et gestion des congés"
        >
          <Button variant="outline" asChild>
            <Link href="/dashboard/leaves/types">
              <Tag className="h-4 w-4" />
              Types de congés
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/leaves/new">
              <CalendarPlus className="h-4 w-4" />
              Nouvelle demande
            </Link>
          </Button>
        </PageHeader>
        <div className="mb-4 flex gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="mb-4 h-9 w-full max-w-xs" />
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Congés"
        description="Suivez les demandes de congé et validez-les facilement."
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/leaves/types">
            <Tag className="h-4 w-4" />
            Types de congés
          </Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/leaves/new">
            <CalendarPlus className="h-4 w-4" />
            Nouvelle demande
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-wrap gap-2 border-b pb-4">
        <Button
          type="button"
          variant={mainTab === "demandes" ? "default" : "outline"}
          size="sm"
          onClick={() => setMainTab("demandes")}
        >
          <ListChecks className="h-4 w-4" />
          Demandes
        </Button>
        <Button
          type="button"
          variant={mainTab === "attente" ? "default" : "outline"}
          size="sm"
          onClick={() => setMainTab("attente")}
        >
          En attente
        </Button>
      </div>

      {mainTab === "demandes" && (
        <>
          <div className="mb-4">
            <Select
              value={statusFilter}
              onValueChange={(v: string | null, _details: unknown) =>
                setStatusFilter(v || ALL_STATUS)
              }
            >
              <SelectTrigger className="w-full max-w-xs">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS}>Toutes</SelectItem>
                <SelectItem value="PENDING">En attente</SelectItem>
                <SelectItem value="APPROVED">Approuvées</SelectItem>
                <SelectItem value="REJECTED">Rejetées</SelectItem>
                <SelectItem value="CANCELLED">Annulées</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <DataTable
              columns={columns}
              data={requests}
              emptyMessage="Aucune demande de congé pour ce filtre."
            />
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </>
      )}

      {mainTab === "attente" && (
        <div className="space-y-4">
          {pendingLoading && pendingList.length === 0 && !pendingError && (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {pendingError && (
            <p className="text-sm text-muted-foreground">
              {pendingError.includes("Permission")
                ? "Vous n’avez pas la permission d’approuver les congés."
                : pendingError}
            </p>
          )}

          {!pendingLoading && !pendingError && pendingList.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune demande en attente de validation.
            </p>
          )}

          {pendingList.map((req) => (
            <Card key={req.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {req.employee.firstName} {req.employee.lastName}
                </CardTitle>
                <CardDescription>
                  {formatDateFR(req.startDate)} → {formatDateFR(req.endDate)}{" "}
                  · {req.totalDays} jour(s)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">Type</span>
                  <Badge variant="outline" className="gap-1.5 font-normal">
                    <span
                      className="inline-block size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: req.leaveType.color }}
                      aria-hidden
                    />
                    {req.leaveType.name}
                  </Badge>
                </div>
                {req.reason ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Motif : </span>
                    {req.reason}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Aucun motif renseigné.
                  </p>
                )}

                {rejectingId === req.id && (
                  <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                    <label
                      htmlFor={`reject-note-${req.id}`}
                      className="text-xs font-medium text-muted-foreground"
                    >
                      Note de rejet (optionnel)
                    </label>
                    <Input
                      id={`reject-note-${req.id}`}
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="Précisez la raison du rejet…"
                      maxLength={500}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={actionId === req.id}
                        onClick={() => void handleRejectConfirm(req.id)}
                      >
                        Confirmer le rejet
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setRejectingId(null);
                          setRejectNote("");
                        }}
                      >
                        Fermer
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/30">
                <Button
                  type="button"
                  className="bg-green-600 text-white hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
                  size="sm"
                  disabled={actionId === req.id || rejectingId === req.id}
                  onClick={() => void handleApprove(req.id)}
                >
                  Approuver
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={actionId === req.id}
                  onClick={() => {
                    if (rejectingId === req.id) {
                      setRejectingId(null);
                      setRejectNote("");
                    } else {
                      setRejectingId(req.id);
                      setRejectNote("");
                    }
                  }}
                >
                  {rejectingId === req.id ? "Retour" : "Rejeter"}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
