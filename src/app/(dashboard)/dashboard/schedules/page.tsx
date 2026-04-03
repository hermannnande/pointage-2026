"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
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
import { Skeleton } from "@/components/ui/skeleton";

import { deleteScheduleAction, getSchedulesAction } from "./actions";

const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const WEEK_SHORT_LABELS = ["Lu", "Ma", "Me", "Je", "Ve", "Sa", "Di"] as const;

type ScheduleRow = Awaited<ReturnType<typeof getSchedulesAction>>[number];

function formatTimeCompact(t: string) {
  const part = t.length >= 5 ? t.slice(0, 5) : t;
  return part.replace(":", "-");
}

function cellLabel(shift: ScheduleRow["shifts"][number] | undefined) {
  if (!shift || !shift.isWorkDay) return "Repos";
  return `${formatTimeCompact(shift.startTime)}-${formatTimeCompact(shift.endTime)}`;
}

function shiftsForWeekDisplay(schedule: ScheduleRow) {
  const byDay = new Map(schedule.shifts.map((s) => [s.dayOfWeek, s]));
  return WEEK_DISPLAY_ORDER.map((d) => byDay.get(d));
}

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSchedulesAction();
      setSchedules(data);
    } catch {
      toast.error("Impossible de charger les plannings");
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (
        !window.confirm(
          `Supprimer le planning « ${name} » ? Cette action est irréversible.`,
        )
      ) {
        return;
      }
      const result = await deleteScheduleAction(id);
      if (result.success) {
        toast.success("Planning supprimé");
        void load();
      } else {
        toast.error(result.error ?? "Échec de la suppression");
      }
    },
    [load],
  );

  return (
    <>
      <PageHeader
        title="Plannings"
        description="Organisez les horaires de travail de vos équipes et définissez les jours de repos."
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/schedules/weekly">Vue semaine</Link>
        </Button>
        <Button size="sm" asChild>
          <Link href="/dashboard/schedules/new">Nouveau planning</Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
              <CardFooter>
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <CalendarRange className="mb-3 size-10 text-muted-foreground" />
          <p className="max-w-sm text-sm text-muted-foreground">
            Aucun planning créé. Commencez par créer votre premier planning.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard/schedules/new">Nouveau planning</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => {
            const weekShifts = shiftsForWeekDisplay(schedule);
            return (
              <Card key={schedule.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CardTitle className="pr-2">{schedule.name}</CardTitle>
                    <div className="flex flex-wrap gap-1">
                      {schedule.isTemplate && (
                        <Badge variant="outline">Modèle</Badge>
                      )}
                      <Badge variant={schedule.isActive ? "default" : "secondary"}>
                        {schedule.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                  </div>
                  {schedule.description ? (
                    <CardDescription>{schedule.description}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[220px] border-collapse text-center text-xs">
                      <thead>
                        <tr>
                          {WEEK_SHORT_LABELS.map((label) => (
                            <th
                              key={label}
                              className="border-b bg-muted/40 px-0.5 py-1 font-medium text-muted-foreground"
                            >
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {weekShifts.map((shift, idx) => {
                            const work = shift?.isWorkDay ?? false;
                            const dow = WEEK_DISPLAY_ORDER[idx] ?? 0;
                            return (
                              <td
                                key={dow}
                                title={DAY_LABELS[dow]}
                                className={
                                  work
                                    ? "bg-emerald-100 px-0.5 py-1.5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                                    : "bg-muted/60 px-0.5 py-1.5 text-muted-foreground"
                                }
                              >
                                {cellLabel(shift)}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {schedule._count.assignments} affecté(s)
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/30">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/schedules/${schedule.id}`}>
                      Modifier
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/schedules/${schedule.id}/assign`}>
                      Affecter
                    </Link>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    type="button"
                    onClick={() => void handleDelete(schedule.id, schedule.name)}
                  >
                    Supprimer
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
