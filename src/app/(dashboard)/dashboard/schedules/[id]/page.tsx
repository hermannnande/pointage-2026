"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import type { ShiftInput } from "@/validations/schedule.schema";

import {
  getScheduleByIdAction,
  updateScheduleAction,
  unassignScheduleAction,
} from "../actions";

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

type ScheduleDetail = NonNullable<
  Awaited<ReturnType<typeof getScheduleByIdAction>>
>;
type AssignmentRow = ScheduleDetail["assignments"][number];

function restShift(dayOfWeek: number): ShiftInput {
  return {
    dayOfWeek,
    startTime: "00:00",
    endTime: "00:00",
    breakMinutes: 0,
    isWorkDay: false,
  };
}

function shiftFromDb(
  dayOfWeek: number,
  s: ScheduleDetail["shifts"][number],
): ShiftInput {
  return {
    dayOfWeek,
    startTime: (s.startTime ?? "08:00").slice(0, 5),
    endTime: (s.endTime ?? "17:00").slice(0, 5),
    breakMinutes: s.breakMinutes ?? 0,
    isWorkDay: s.isWorkDay,
  };
}

function buildGridShifts(schedule: ScheduleDetail): ShiftInput[] {
  const byDay = new Map(schedule.shifts.map((s) => [s.dayOfWeek, s]));
  return DAY_ORDER.map((dow) => {
    const found = byDay.get(dow);
    if (!found) return restShift(dow);
    return shiftFromDb(dow, found);
  });
}

export default function EditSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [schedule, setSchedule] = useState<ScheduleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [gridShifts, setGridShifts] = useState<ShiftInput[]>(() =>
    DAY_ORDER.map((dow) => restShift(dow)),
  );

  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback((s: ScheduleDetail) => {
    setName(s.name);
    setDescription(s.description ?? "");
    setIsTemplate(s.isTemplate);
    setIsActive(s.isActive);
    setGridShifts(buildGridShifts(s));
  }, []);

  const loadSchedule = useCallback(async () => {
    if (!id) return null;
    const data = await getScheduleByIdAction(id);
    return data;
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const data = await loadSchedule();
        if (cancelled) return;
        if (!data) {
          setSchedule(null);
          setNotFound(true);
        } else {
          setSchedule(data);
          hydrate(data);
        }
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger le planning");
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, hydrate, loadSchedule]);

  function updateShiftAtIndex(index: number, patch: Partial<ShiftInput>) {
    setGridShifts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  async function handleUnassign(assignmentId: string) {
    setRemovingId(assignmentId);
    try {
      const result = await unassignScheduleAction(assignmentId);
      if (result.success) {
        toast.success("Employé retiré du planning");
        const data = await loadSchedule();
        if (data) {
          setSchedule(data);
          hydrate(data);
        }
        router.refresh();
      } else {
        toast.error(result.error ?? "Échec du retrait");
      }
    } catch {
      toast.error("Échec du retrait");
    } finally {
      setRemovingId(null);
    }
  }

  const assignmentColumns = useMemo<ColumnDef<AssignmentRow>[]>(
    () => [
      {
        id: "name",
        header: "Nom",
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
        accessorKey: "employee.position",
        header: "Poste",
        cell: ({ row }) => row.original.employee.position ?? "—",
      },
      {
        id: "site",
        header: "Site",
        cell: ({ row }) => row.original.employee.site?.name ?? "—",
      },
      {
        id: "startDate",
        header: "Date de début",
        cell: ({ row }) =>
          new Intl.DateTimeFormat("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          }).format(new Date(row.original.startDate)),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const aid = row.original.id;
          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={removingId === aid}
              onClick={() => void handleUnassign(aid)}
            >
              {removingId === aid ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Retirer"
              )}
            </Button>
          );
        },
      },
    ],
    [removingId],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await updateScheduleAction({
        id,
        name: name.trim(),
        description: description.trim() || undefined,
        isTemplate,
        isActive,
        shifts: gridShifts,
      });
      if (result.success) {
        toast.success("Planning mis à jour");
        router.refresh();
        const data = await loadSchedule();
        if (data) {
          setSchedule(data);
          hydrate(data);
        }
      } else {
        setError(result.error ?? "Une erreur est survenue");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chargement…" />
        <div className="h-64 w-full max-w-3xl animate-pulse rounded-lg bg-muted" />
      </>
    );
  }

  if (notFound || !schedule) {
    return (
      <>
        <PageHeader title="Planning introuvable" />
        <p className="mb-4 text-sm text-muted-foreground">
          Ce planning n’existe pas ou vous n’y avez pas accès.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/schedules">
            <ArrowLeft className="h-4 w-4" />
            Retour aux plannings
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader title={schedule.name} />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Modifier le planning</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={255}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-4 sm:justify-start">
                <Label htmlFor="isTemplate" className="cursor-pointer">
                  Modèle réutilisable
                </Label>
                <Switch
                  id="isTemplate"
                  checked={isTemplate}
                  onCheckedChange={(checked: boolean) => setIsTemplate(checked)}
                />
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-start">
                <Label htmlFor="isActive" className="cursor-pointer">
                  Planning actif
                </Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(checked: boolean) => setIsActive(checked)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Shifts hebdomadaires</Label>
              <div className="space-y-4 rounded-lg border border-border p-4">
                {DAY_ORDER.map((dow, index) => {
                  const row = gridShifts[index] ?? restShift(dow);
                  return (
                    <div
                      key={dow}
                      className="grid gap-3 border-b border-border pb-4 last:border-0 last:pb-0 sm:grid-cols-[140px_1fr]"
                    >
                      <div className="font-medium text-foreground">
                        {DAY_LABELS[dow]}
                      </div>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between gap-4">
                          <Label
                            htmlFor={`work-${dow}`}
                            className="cursor-pointer text-sm font-normal text-muted-foreground"
                          >
                            Jour travaillé
                          </Label>
                          <Switch
                            id={`work-${dow}`}
                            checked={row.isWorkDay}
                            onCheckedChange={(checked: boolean) => {
                              if (checked) {
                                updateShiftAtIndex(index, {
                                  isWorkDay: true,
                                  startTime:
                                    row.startTime === "00:00" &&
                                    row.endTime === "00:00"
                                      ? "08:00"
                                      : row.startTime,
                                  endTime:
                                    row.startTime === "00:00" &&
                                    row.endTime === "00:00"
                                      ? "17:00"
                                      : row.endTime,
                                });
                              } else {
                                updateShiftAtIndex(index, {
                                  isWorkDay: false,
                                  startTime: "00:00",
                                  endTime: "00:00",
                                });
                              }
                            }}
                          />
                        </div>
                        {row.isWorkDay ? (
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="grid gap-1.5">
                              <Label htmlFor={`start-${dow}`} className="text-xs">
                                Début
                              </Label>
                              <Input
                                id={`start-${dow}`}
                                type="time"
                                value={row.startTime}
                                onChange={(e) =>
                                  updateShiftAtIndex(index, {
                                    startTime: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label htmlFor={`end-${dow}`} className="text-xs">
                                Fin
                              </Label>
                              <Input
                                id={`end-${dow}`}
                                type="time"
                                value={row.endTime}
                                onChange={(e) =>
                                  updateShiftAtIndex(index, {
                                    endTime: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="grid gap-1.5">
                              <Label
                                htmlFor={`break-${dow}`}
                                className="text-xs"
                              >
                                Pause (min)
                              </Label>
                              <Input
                                id={`break-${dow}`}
                                type="number"
                                min={0}
                                max={480}
                                value={row.breakMinutes}
                                onChange={(e) =>
                                  updateShiftAtIndex(index, {
                                    breakMinutes:
                                      Number.parseInt(e.target.value, 10) || 0,
                                  })
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Repos</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 border-t bg-transparent">
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer les modifications"
                )}
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/schedules">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Link>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      <div className="mt-8 max-w-3xl">
        <h2 className="mb-3 text-lg font-semibold">
          Employés actuellement affectés
        </h2>
        <DataTable
          columns={assignmentColumns}
          data={schedule.assignments}
          emptyMessage="Aucun employé affecté à ce planning."
        />
      </div>
    </>
  );
}
