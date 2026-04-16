"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import Link from "next/link";
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
  exportPresenceCsvAction,
  getAbsenceReportAction,
  getEmployeesForFilterAction,
  getLateReportAction,
  getPresenceSummaryAction,
  getSitesForFilterAction,
} from "./actions";

const ALL_SITES = "__all__";
const ALL_EMPLOYEES = "__all__";
const PAGE_SIZE = 25;

type ReportKind = "presence" | "late" | "absence";

type PresenceRow = Awaited<
  ReturnType<typeof getPresenceSummaryAction>
>[number];
type LateRow = Awaited<ReturnType<typeof getLateReportAction>>[number];
type AbsenceRow = Awaited<ReturnType<typeof getAbsenceReportAction>>[number];
type SiteOption = Awaited<ReturnType<typeof getSitesForFilterAction>>[number];
type EmployeeOption = Awaited<
  ReturnType<typeof getEmployeesForFilterAction>
>[number];

function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

function fmtDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtTime(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstDayOfMonthIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${mo}-01`;
}

function todayIsoLocal(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportKind>("presence");
  const [startDate, setStartDate] = useState(firstDayOfMonthIso);
  const [endDate, setEndDate] = useState(todayIsoLocal);
  const [siteFilter, setSiteFilter] = useState(ALL_SITES);
  const [employeeFilter, setEmployeeFilter] = useState(ALL_EMPLOYEES);

  const [sites, setSites] = useState<SiteOption[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(true);

  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [page, setPage] = useState(1);

  const [presenceRows, setPresenceRows] = useState<PresenceRow[]>([]);
  const [lateRows, setLateRows] = useState<LateRow[]>([]);
  const [absenceRows, setAbsenceRows] = useState<AbsenceRow[]>([]);

  useEffect(() => {
    setHasGenerated(false);
    setPresenceRows([]);
    setLateRows([]);
    setAbsenceRows([]);
    setPage(1);
  }, [reportType]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEmployeesLoading(true);
      try {
        const data = await getEmployeesForFilterAction();
        if (!cancelled) setEmployees(data);
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les employés");
          setEmployees([]);
        }
      } finally {
        if (!cancelled) setEmployeesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filterPayload = useMemo(
    () => ({
      siteId: siteFilter === ALL_SITES ? undefined : siteFilter,
      employeeId:
        reportType === "presence" && employeeFilter !== ALL_EMPLOYEES
          ? employeeFilter
          : undefined,
      startDate,
      endDate,
    }),
    [siteFilter, employeeFilter, reportType, startDate, endDate],
  );

  const handleGenerate = useCallback(async () => {
    setHasGenerated(true);
    setLoading(true);
    setPage(1);
    try {
      if (reportType === "presence") {
        const data = await getPresenceSummaryAction({
          siteId: filterPayload.siteId,
          employeeId: filterPayload.employeeId,
          startDate: filterPayload.startDate,
          endDate: filterPayload.endDate,
        });
        setPresenceRows(data);
        setLateRows([]);
        setAbsenceRows([]);
      } else if (reportType === "late") {
        const data = await getLateReportAction({
          siteId: filterPayload.siteId,
          startDate: filterPayload.startDate,
          endDate: filterPayload.endDate,
        });
        setLateRows(data);
        setPresenceRows([]);
        setAbsenceRows([]);
      } else {
        const data = await getAbsenceReportAction({
          siteId: filterPayload.siteId,
          startDate: filterPayload.startDate,
          endDate: filterPayload.endDate,
        });
        setAbsenceRows(data);
        setPresenceRows([]);
        setLateRows([]);
      }
    } catch {
      toast.error("Impossible de générer le rapport");
      setPresenceRows([]);
      setLateRows([]);
      setAbsenceRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterPayload, reportType]);

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      const csv = await exportPresenceCsvAction({
        siteId: filterPayload.siteId,
        employeeId: filterPayload.employeeId,
        startDate: filterPayload.startDate,
        endDate: filterPayload.endDate,
      });
      downloadCsv(
        csv,
        `rapport-presence_${filterPayload.startDate}_${filterPayload.endDate}.csv`,
      );
      toast.success("Fichier CSV téléchargé");
    } catch {
      toast.error("Échec de l’export CSV");
    } finally {
      setExporting(false);
    }
  }, [filterPayload]);

  const presenceColumns = useMemo<ColumnDef<PresenceRow>[]>(
    () => [
      { id: "name", header: "Nom", cell: ({ row }) => row.original.name },
      {
        id: "matricule",
        header: "Matricule",
        cell: ({ row }) => row.original.matricule ?? "—",
      },
      {
        id: "position",
        header: "Poste",
        cell: ({ row }) => row.original.position ?? "—",
      },
      {
        id: "site",
        header: "Lieu",
        cell: ({ row }) => row.original.site ?? "—",
      },
      {
        id: "daysPresent",
        header: "Jours présent",
        cell: ({ row }) => row.original.daysPresent,
      },
      {
        id: "daysLate",
        header: "Jours retard",
        cell: ({ row }) => row.original.daysLate,
      },
      {
        id: "daysAbsent",
        header: "Jours absent",
        cell: ({ row }) => row.original.daysAbsent,
      },
      {
        id: "worked",
        header: "Heures travaillées",
        cell: ({ row }) => fmtMin(row.original.totalWorkedMin),
      },
      {
        id: "overtime",
        header: "Heures sup.",
        cell: ({ row }) => fmtMin(row.original.totalOvertimeMin),
      },
    ],
    [],
  );

  const lateColumns = useMemo<ColumnDef<LateRow>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => fmtDate(row.original.date),
      },
      {
        id: "employee",
        header: "Employé",
        cell: ({ row }) => row.original.employee,
      },
      {
        id: "matricule",
        header: "Matricule",
        cell: ({ row }) => row.original.matricule ?? "—",
      },
      {
        id: "site",
        header: "Lieu",
        cell: ({ row }) => row.original.site,
      },
      {
        id: "clockIn",
        header: "Heure d’arrivée",
        cell: ({ row }) => fmtTime(row.original.clockIn),
      },
      {
        id: "late",
        header: "Retard",
        cell: ({ row }) => `${row.original.lateMinutes} min`,
      },
    ],
    [],
  );

  const absenceColumns = useMemo<ColumnDef<AbsenceRow>[]>(
    () => [
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => fmtDate(row.original.date),
      },
      {
        id: "employee",
        header: "Employé",
        cell: ({ row }) => row.original.employee,
      },
      {
        id: "matricule",
        header: "Matricule",
        cell: ({ row }) => row.original.matricule ?? "—",
      },
      {
        id: "site",
        header: "Lieu",
        cell: ({ row }) => row.original.site,
      },
    ],
    [],
  );

  const activeRows =
    reportType === "presence"
      ? presenceRows
      : reportType === "late"
        ? lateRows
        : absenceRows;

  const totalPages = Math.max(1, Math.ceil(activeRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return activeRows.slice(start, start + PAGE_SIZE);
  }, [activeRows, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const presenceStats = useMemo(() => {
    if (!presenceRows.length) {
      return {
        employees: 0,
        daysWorked: 0,
        late: 0,
        absences: 0,
      };
    }
    return {
      employees: presenceRows.length,
      daysWorked: presenceRows.reduce((s, r) => s + r.daysPresent, 0),
      late: presenceRows.reduce((s, r) => s + r.daysLate, 0),
      absences: presenceRows.reduce((s, r) => s + r.daysAbsent, 0),
    };
  }, [presenceRows]);

  const canExportCsv =
    hasGenerated &&
    reportType === "presence" &&
    presenceRows.length > 0 &&
    !loading;

  const buttonsDisabled = loading || exporting || sitesLoading;

  return (
    <>
      <PageHeader
        title="Rapports"
        description="Consultez les statistiques de présence, retard et absence. Exportez les données pour la paie."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/help">Aide</Link>
        </Button>
      </PageHeader>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label>Type de rapport</Label>
              <Select
                value={reportType}
                onValueChange={(v) =>
                  setReportType((v || "presence") as ReportKind)
                }
                disabled={buttonsDisabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="presence">Synthèse de présence</SelectItem>
                  <SelectItem value="late">Retards</SelectItem>
                  <SelectItem value="absence">Absences</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-start">Début</Label>
              <Input
                id="report-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value || "")}
                disabled={buttonsDisabled}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="report-end">Fin</Label>
              <Input
                id="report-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value || "")}
                disabled={buttonsDisabled}
                className="w-full"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Lieu</Label>
              <Select
                value={siteFilter}
                onValueChange={(v) => setSiteFilter(v || ALL_SITES)}
                disabled={buttonsDisabled}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tous les lieux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SITES}>Tous</SelectItem>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reportType === "presence" && (
              <div className="flex flex-col gap-1.5">
                <Label>Employé</Label>
                <Select
                  value={employeeFilter}
                  onValueChange={(v) => setEmployeeFilter(v || ALL_EMPLOYEES)}
                  disabled={buttonsDisabled || employeesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tous les employés" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_EMPLOYEES}>Tous</SelectItem>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.lastName} {e.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={buttonsDisabled}
            >
              Générer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportCsv()}
              disabled={!canExportCsv || exporting || sitesLoading}
            >
              <Download className="mr-2 h-4 w-4" />
              Exporter CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {!hasGenerated && !loading && (
        <div className="rounded-lg border border-dashed bg-muted/30 px-6 py-16 text-center text-sm text-muted-foreground">
          Configurez les filtres et cliquez sur Générer
        </div>
      )}

      {hasGenerated && loading && (
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {hasGenerated && !loading && (
        <div
          className={loading ? "pointer-events-none opacity-60" : undefined}
        >
          {reportType === "presence" && presenceRows.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge variant="secondary">
                {presenceStats.employees} employé
                {presenceStats.employees !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary">
                {presenceStats.daysWorked} jours travaillés
              </Badge>
              <Badge variant="secondary">
                {presenceStats.late} retard{presenceStats.late !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="secondary">
                {presenceStats.absences} absence
                {presenceStats.absences !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}

          {reportType === "presence" && (
            <DataTable
              columns={presenceColumns}
              data={paginatedRows as PresenceRow[]}
              emptyMessage="Aucune donnée pour cette période."
            />
          )}
          {reportType === "late" && (
            <DataTable
              columns={lateColumns}
              data={paginatedRows as LateRow[]}
              emptyMessage="Aucun retard pour cette période."
            />
          )}
          {reportType === "absence" && (
            <DataTable
              columns={absenceColumns}
              data={paginatedRows as AbsenceRow[]}
              emptyMessage="Aucune absence pour cette période."
            />
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={activeRows.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      )}
    </>
  );
}
