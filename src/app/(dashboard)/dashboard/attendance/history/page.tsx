"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import type { AttendanceStatus } from "@prisma/client";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getAttendanceRecordsAction,
  getPendingCorrectionsAction,
  getSitesForFilterAction,
  requestCorrectionAction,
  reviewCorrectionAction,
} from "../actions";

const ALL_SITES = "__all__";
const ALL_STATUS = "__all__";

type RecordsPayload = Awaited<ReturnType<typeof getAttendanceRecordsAction>>;
type AttendanceRow = RecordsPayload["records"][number];
type SiteOption = Awaited<ReturnType<typeof getSitesForFilterAction>>[number];
type PendingCorrection = Awaited<
  ReturnType<typeof getPendingCorrectionsAction>
>[number];

type CorrectionField = "clockIn" | "clockOut" | "status" | "notes";

function fmtTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtDuration(minutes: number): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function statusLabelFr(status: AttendanceStatus): string {
  const labels: Record<AttendanceStatus, string> = {
    PRESENT: "Présent",
    ABSENT: "Absent",
    LATE: "En retard",
    EARLY_DEPARTURE: "Départ anticipé",
    HALF_DAY: "Demi-journée",
    ON_LEAVE: "Congé",
    HOLIDAY: "Jour férié",
    REST_DAY: "Repos",
  };
  return labels[status] ?? status;
}

function statusBadgeVariant(
  s: AttendanceStatus,
): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "PRESENT":
      return "default";
    case "LATE":
      return "destructive";
    case "ABSENT":
      return "secondary";
    case "EARLY_DEPARTURE":
      return "outline";
    default:
      return "secondary";
  }
}

function fieldLabelFr(field: string): string {
  const m: Record<string, string> = {
    clockIn: "Entrée",
    clockOut: "Sortie",
    status: "Statut",
    notes: "Notes",
  };
  return m[field] ?? field;
}

function getOldValueForField(
  record: AttendanceRow,
  field: CorrectionField,
): string | undefined {
  if (field === "clockIn") {
    return record.clockIn ? record.clockIn.toISOString() : undefined;
  }
  if (field === "clockOut") {
    return record.clockOut ? record.clockOut.toISOString() : undefined;
  }
  if (field === "status") return record.status;
  if (field === "notes") return record.notes ?? undefined;
  return undefined;
}

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

export default function AttendanceHistoryPage() {
  const [dateFilter, setDateFilter] = useState(todayIsoLocal);
  const [siteFilter, setSiteFilter] = useState(ALL_SITES);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [payload, setPayload] = useState<RecordsPayload | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRow | null>(
    null,
  );
  const [fieldChanged, setFieldChanged] = useState<CorrectionField>("clockIn");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [pending, setPending] = useState<PendingCorrection[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, siteFilter, statusFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSitesLoading(true);
      try {
        const data = await getSitesForFilterAction();
        if (!cancelled) setSites(data);
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les lieux de travail");
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

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const list = await getPendingCorrectionsAction();
      setPending(list);
    } catch {
      setPending([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAttendanceRecordsAction({
        date: dateFilter || undefined,
        siteId:
          siteFilter === ALL_SITES ? undefined : siteFilter || undefined,
        status:
          statusFilter === ALL_STATUS ? undefined : statusFilter || undefined,
        page,
        pageSize: 25,
      });
      setPayload(data);
    } catch {
      toast.error("Impossible de charger l’historique");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [dateFilter, siteFilter, statusFilter, page]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (selectedRecord) {
      setFieldChanged("clockIn");
      setNewValue("");
      setReason("");
    }
  }, [selectedRecord]);

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setSubmittingCorrection(true);
    try {
      const result = await requestCorrectionAction({
        recordId: selectedRecord.id,
        fieldChanged,
        oldValue: getOldValueForField(selectedRecord, fieldChanged),
        newValue: newValue.trim(),
        reason: reason.trim(),
      });
      if (result.success) {
        toast.success("Demande de correction envoyée");
        setSelectedRecord(null);
        setNewValue("");
        setReason("");
        void loadRecords();
        void loadPending();
      } else {
        toast.error(result.error ?? "Échec de l’envoi");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const handleReview = async (
    correctionId: string,
    status: "APPROVED" | "REJECTED",
  ) => {
    setReviewingId(correctionId);
    try {
      const result = await reviewCorrectionAction({
        correctionId,
        status,
        reviewNote: undefined,
      });
      if (result.success) {
        toast.success(
          status === "APPROVED" ? "Correction approuvée" : "Correction rejetée",
        );
        void loadPending();
        void loadRecords();
      } else {
        toast.error(result.error ?? "Action impossible");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setReviewingId(null);
    }
  };

  const columns = useMemo<ColumnDef<AttendanceRow>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => fmtDate(row.original.date),
      },
      {
        id: "employee",
        header: "Employé",
        cell: ({ row }) => {
          const e = row.original.employee;
          return `${e.firstName} ${e.lastName}`;
        },
      },
      {
        id: "site",
        header: "Lieu",
        cell: ({ row }) => row.original.site?.name ?? "—",
      },
      {
        id: "clockIn",
        header: "Entrée",
        cell: ({ row }) => {
          const r = row.original as AttendanceRow & { clockInAddress?: string | null };
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
          const r = row.original as AttendanceRow & { clockOutAddress?: string | null };
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
        id: "worked",
        header: "Travaillé",
        cell: ({ row }) => fmtDuration(row.original.workedMinutes),
      },
      {
        id: "late",
        header: "Retard",
        cell: ({ row }) =>
          row.original.lateMinutes > 0
            ? `${row.original.lateMinutes} min`
            : "—",
      },
      {
        id: "status",
        header: "Statut",
        cell: ({ row }) => (
          <Badge variant={statusBadgeVariant(row.original.status)}>
            {statusLabelFr(row.original.status)}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSelectedRecord(row.original)}
          >
            Corriger
          </Button>
        ),
      },
    ],
    [],
  );

  const records = payload?.records ?? [];
  const total = payload?.total ?? 0;
  const totalPages = Math.max(1, payload?.totalPages ?? 1);
  const pageSize = payload?.pageSize ?? 25;
  const currentPage = payload?.page ?? page;

  return (
    <>
      <PageHeader
        title="Historique de pointage"
        description="Consultez et corrigez les pointages"
      />

      <div className="mb-6 flex flex-col flex-wrap gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="history-date">Date</Label>
          <Input
            id="history-date"
            type="date"
            className="w-full sm:w-44"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Lieu</Label>
          <Select
            value={siteFilter}
            onValueChange={(v) => setSiteFilter(v || ALL_SITES)}
            disabled={sitesLoading}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Tous les lieux" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_SITES}>Tous les lieux</SelectItem>
              {sites.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Statut</Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v || ALL_STATUS)}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder="Tous" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUS}>Tous</SelectItem>
              <SelectItem value="PRESENT">Présent</SelectItem>
              <SelectItem value="LATE">En retard</SelectItem>
              <SelectItem value="ABSENT">Absent</SelectItem>
              <SelectItem value="EARLY_DEPARTURE">Départ anticipé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading && !payload ? (
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className={loading ? "pointer-events-none opacity-60" : ""}>
          <DataTable
            columns={columns}
            data={records}
            emptyMessage="Aucun pointage pour ces critères."
          />
        </div>
      )}

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />

      {selectedRecord && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Demande de correction</CardTitle>
            <p className="text-sm text-muted-foreground">
              {selectedRecord.employee.firstName}{" "}
              {selectedRecord.employee.lastName} — {fmtDate(selectedRecord.date)}{" "}
              · {selectedRecord.site?.name ?? "Sans lieu"}
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmitCorrection}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="field-changed">Champ modifié</Label>
                  <Select
                    value={fieldChanged}
                    onValueChange={(v) =>
                      setFieldChanged((v as CorrectionField) || "clockIn")
                    }
                  >
                    <SelectTrigger id="field-changed" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clockIn">Entrée (horaire)</SelectItem>
                      <SelectItem value="clockOut">Sortie (horaire)</SelectItem>
                      <SelectItem value="status">Statut</SelectItem>
                      <SelectItem value="notes">Notes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="new-value">Nouvelle valeur</Label>
                  <Input
                    id="new-value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="Ex. ISO 2025-03-31T08:00:00 ou PRESENT"
                    required
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Motif</Label>
                <textarea
                  id="reason"
                  className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Expliquez la raison de la correction (min. 3 caractères)"
                  required
                  minLength={3}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={submittingCorrection}>
                  Envoyer la demande
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedRecord(null)}
                  disabled={submittingCorrection}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">
          Demandes de correction en attente
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Validation réservée aux profils autorisés. Les boutons Approuver /
          Rejeter n’aboutissent que si vous disposez des droits nécessaires.
        </p>
        {pendingLoading ? (
          <div className="mt-4 space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Aucune demande en attente.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pending.map((c) => {
              const emp = c.record.employee;
              return (
                <li key={c.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1 text-sm">
                        <p className="font-medium">
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {fieldLabelFr(c.fieldChanged)}
                          </span>
                          {" : "}
                          <span className="line-through">
                            {c.oldValue ?? "—"}
                          </span>
                          {" → "}
                          <span>{c.newValue}</span>
                        </p>
                        <p className="text-muted-foreground">
                          Motif : {c.reason}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Demandé le {fmtDate(c.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          className="bg-green-600 text-white hover:bg-green-500"
                          size="sm"
                          disabled={reviewingId === c.id}
                          onClick={() => void handleReview(c.id, "APPROVED")}
                        >
                          Approuver
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          disabled={reviewingId === c.id}
                          onClick={() => void handleReview(c.id, "REJECTED")}
                        >
                          Rejeter
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
