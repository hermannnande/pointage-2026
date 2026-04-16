"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getWeeklyViewAction, getSitesForFilterAction } from "../actions";

const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const ALL_SITES = "__all__";

type WeeklyPayload = Awaited<ReturnType<typeof getWeeklyViewAction>>;
type WeeklyEmployee = WeeklyPayload["employees"][number];
type SiteRow = Awaited<ReturnType<typeof getSitesForFilterAction>>[number];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function formatLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function attendanceDotClass(status: string, isLate: boolean): string {
  if (status === "LATE" || isLate) return "bg-amber-500";
  if (status === "PRESENT") return "bg-green-500";
  if (status === "ABSENT") return "bg-red-500";
  return "bg-muted-foreground/40";
}

export default function WeeklySchedulesPage() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [siteId, setSiteId] = useState(ALL_SITES);
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [data, setData] = useState<WeeklyPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSitesLoading(true);
      try {
        const list = await getSitesForFilterAction();
        if (!cancelled) setSites(list);
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

  const weekParam = useMemo(() => formatLocalYmd(weekStart), [weekStart]);

  const loadWeek = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await getWeeklyViewAction(
        siteId === ALL_SITES ? undefined : siteId || undefined,
        weekParam,
      );
      setData(payload);
    } catch {
      toast.error("Impossible de charger la vue semaine");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [siteId, weekParam]);

  useEffect(() => {
    void loadWeek();
  }, [loadWeek]);

  const columnDates = useMemo(
    () => DAY_ORDER.map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const weekTitle = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(weekStart);

  function prevWeek() {
    setWeekStart((w) => addDays(w, -7));
  }

  function nextWeek() {
    setWeekStart((w) => addDays(w, 7));
  }

  function cellContent(emp: WeeklyEmployee, cellDate: Date) {
    const jsDay = cellDate.getDay();
    const shifts = emp.schedule?.shifts;
    const shift = shifts?.find((s) => s.dayOfWeek === jsDay);

    if (!shift || !shift.isWorkDay) {
      return (
        <div className="relative flex min-h-10 items-center justify-center rounded-md bg-muted/80 px-1 text-center text-xs text-muted-foreground">
          Repos
          {attendanceOverlay(emp, cellDate)}
        </div>
      );
    }

    return (
      <div className="relative flex min-h-10 flex-col items-center justify-center rounded-md bg-emerald-500/15 px-1 py-1 text-center text-xs font-medium text-emerald-900 dark:text-emerald-100">
        <span>
          {shift.startTime.slice(0, 5)}-{shift.endTime.slice(0, 5)}
        </span>
        {attendanceOverlay(emp, cellDate)}
      </div>
    );
  }

  function attendanceOverlay(emp: WeeklyEmployee, cellDate: Date) {
    const key = localDayKey(cellDate);
    const rec = emp.attendance.find((r) => {
      const d = new Date(r.date);
      return localDayKey(d) === key;
    });
    if (!rec) return null;
    const cls = attendanceDotClass(rec.status, rec.isLate);
    return (
      <span
        className={`absolute right-1 top-1 size-2 rounded-full ring-1 ring-background ${cls}`}
        title={rec.status}
        aria-hidden
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Vue semaine"
        description="Planning hebdomadaire de l'équipe"
      />

      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={prevWeek}
            disabled={loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Semaine précédente
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={nextWeek}
            disabled={loading}
          >
            Semaine suivante
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm font-medium">
            Semaine du {weekTitle}
          </span>
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <Select
          value={siteId}
          onValueChange={(v: string | null) => setSiteId(v || ALL_SITES)}
          disabled={sitesLoading}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filtrer par lieu" />
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

      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="sticky left-0 z-10 min-w-[140px] border-r bg-muted/50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Employé
              </th>
              {columnDates.map((d) => {
                const dow = d.getDay();
                const label = DAY_LABELS[dow].slice(0, 3);
                const dd = new Intl.DateTimeFormat("fr-FR", {
                  day: "2-digit",
                  month: "2-digit",
                }).format(d);
                return (
                  <th
                    key={localDayKey(d)}
                    className="min-w-[88px] px-2 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    {label} {dd}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {!data || data.employees.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {loading
                    ? "Chargement…"
                    : "Aucun employé à afficher pour cette période."}
                </td>
              </tr>
            ) : (
              data.employees.map((emp) => (
                <tr key={emp.id} className="border-b last:border-0">
                  <td className="sticky left-0 z-10 border-r bg-card px-3 py-2 font-medium">
                    {emp.firstName} {emp.lastName}
                  </td>
                  {columnDates.map((d) => (
                    <td key={localDayKey(d)} className="p-1 align-top">
                      {cellContent(emp, d)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Point de présence : vert = présent, ambre = en retard, rouge = absent
        (lorsque le pointage est enregistré).
      </p>
    </>
  );
}
