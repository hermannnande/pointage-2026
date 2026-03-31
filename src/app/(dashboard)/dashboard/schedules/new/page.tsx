"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import type { CreateScheduleInput } from "@/validations/schedule.schema";
import { createScheduleAction, getTemplatesAction } from "../actions";

const DAY_LABELS = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];

/** Lundi → Dimanche (1…6 puis 0) */
const FORM_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const TEMPLATE_NONE = "__none__";

type ShiftFormRow = CreateScheduleInput["shifts"][number];

type TemplateRow = Awaited<ReturnType<typeof getTemplatesAction>>[number];

function defaultShifts(): ShiftFormRow[] {
  const work: Omit<ShiftFormRow, "dayOfWeek"> = {
    isWorkDay: true,
    startTime: "08:00",
    endTime: "17:00",
    breakMinutes: 60,
  };
  const rest: Omit<ShiftFormRow, "dayOfWeek"> = {
    isWorkDay: false,
    startTime: "08:00",
    endTime: "17:00",
    breakMinutes: 0,
  };
  return FORM_DAY_ORDER.map((dayOfWeek) => ({
    dayOfWeek,
    ...(dayOfWeek === 0 || dayOfWeek === 6 ? rest : work),
  }));
}

function normalizeTime(t: string) {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function shiftsFromTemplate(template: TemplateRow): ShiftFormRow[] {
  const byDay = new Map(template.shifts.map((s) => [s.dayOfWeek, s]));
  return FORM_DAY_ORDER.map((dayOfWeek) => {
    const s = byDay.get(dayOfWeek);
    if (!s) {
      return {
        dayOfWeek,
        isWorkDay: false,
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: 0,
      };
    }
    return {
      dayOfWeek,
      isWorkDay: s.isWorkDay,
      startTime: normalizeTime(s.startTime),
      endTime: normalizeTime(s.endTime),
      breakMinutes: s.breakMinutes,
    };
  });
}

export default function NewSchedulePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templateSelect, setTemplateSelect] = useState(TEMPLATE_NONE);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isTemplate, setIsTemplate] = useState(false);
  const [shifts, setShifts] = useState<ShiftFormRow[]>(() => defaultShifts());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shiftsByDay = useMemo(() => {
    const m = new Map<number, ShiftFormRow>();
    shifts.forEach((s) => m.set(s.dayOfWeek, s));
    return m;
  }, [shifts]);

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const data = await getTemplatesAction();
      setTemplates(data);
    } catch {
      toast.error("Impossible de charger les modèles");
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  const updateShift = useCallback(
    (dayOfWeek: number, patch: Partial<ShiftFormRow>) => {
      setShifts((prev) =>
        prev.map((row) =>
          row.dayOfWeek === dayOfWeek ? { ...row, ...patch } : row,
        ),
      );
    },
    [],
  );

  const handleTemplateChange = useCallback(
    (v: string | null) => {
      const id = v || TEMPLATE_NONE;
      setTemplateSelect(id);
      if (id === TEMPLATE_NONE) return;
      const tpl = templates.find((t) => t.id === id);
      if (tpl) setShifts(shiftsFromTemplate(tpl));
    },
    [templates],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const sortedShifts = [...shifts].sort(
        (a, b) => a.dayOfWeek - b.dayOfWeek,
      );
      const result = await createScheduleAction({
        name: name.trim(),
        description: description.trim() || undefined,
        isTemplate,
        shifts: sortedShifts,
      });
      if (result.success) {
        toast.success("Planning créé avec succès");
        router.push("/dashboard/schedules");
      } else {
        setError(result.error ?? "Une erreur est survenue");
        toast.error(result.error ?? "Échec de la création");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Nouveau planning" />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Définir le planning</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {templates.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="template-select">Charger un modèle</Label>
                <Select
                  value={templateSelect}
                  onValueChange={(v: string | null, _details: unknown) =>
                    handleTemplateChange(v || TEMPLATE_NONE)
                  }
                  disabled={templatesLoading}
                >
                  <SelectTrigger id="template-select" className="w-full max-w-md">
                    <SelectValue placeholder="Sélectionner un modèle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TEMPLATE_NONE}>Aucun modèle</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="schedule-name">
                  Nom <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="schedule-name"
                  required
                  minLength={2}
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Équipe jour"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="schedule-desc">Description</Label>
                <Input
                  id="schedule-desc"
                  maxLength={255}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-lg border p-3">
              <Switch
                id="is-template"
                checked={isTemplate}
                onCheckedChange={setIsTemplate}
              />
              <Label htmlFor="is-template" className="cursor-pointer font-normal">
                Enregistrer comme modèle
              </Label>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Horaires par jour</p>
              <div className="space-y-3 rounded-lg border p-3">
                {FORM_DAY_ORDER.map((dow) => {
                  const row = shiftsByDay.get(dow);
                  if (!row) return null;
                  return (
                    <div
                      key={dow}
                      className="flex flex-col gap-2 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:gap-3"
                    >
                      <div className="flex w-full min-w-[7rem] items-center justify-between gap-2 sm:w-32 sm:justify-start">
                        <span className="text-sm font-medium">
                          {DAY_LABELS[dow]}
                        </span>
                        <div className="flex items-center gap-2 sm:ml-auto">
                          <Switch
                            id={`work-${dow}`}
                            checked={row.isWorkDay}
                            onCheckedChange={(checked) =>
                              updateShift(dow, { isWorkDay: checked })
                            }
                          />
                          <Label
                            htmlFor={`work-${dow}`}
                            className="cursor-pointer text-xs font-normal text-muted-foreground"
                          >
                            Jour travaillé
                          </Label>
                        </div>
                      </div>
                      {row.isWorkDay ? (
                        <div className="flex flex-1 flex-wrap items-end gap-2">
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`start-${dow}`}
                              className="text-xs text-muted-foreground"
                            >
                              Début
                            </Label>
                            <Input
                              id={`start-${dow}`}
                              type="time"
                              className="w-[7rem]"
                              value={row.startTime}
                              onChange={(e) =>
                                updateShift(dow, { startTime: e.target.value })
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`end-${dow}`}
                              className="text-xs text-muted-foreground"
                            >
                              Fin
                            </Label>
                            <Input
                              id={`end-${dow}`}
                              type="time"
                              className="w-[7rem]"
                              value={row.endTime}
                              onChange={(e) =>
                                updateShift(dow, { endTime: e.target.value })
                              }
                            />
                          </div>
                          <div className="grid min-w-[5rem] flex-1 gap-1">
                            <Label
                              htmlFor={`break-${dow}`}
                              className="text-xs text-muted-foreground"
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
                                updateShift(dow, {
                                  breakMinutes: Number.parseInt(
                                    e.target.value,
                                    10,
                                  ) || 0,
                                })
                              }
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                          Repos
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t">
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              Créer le planning
            </Button>
            <Button variant="outline" type="button" asChild disabled={submitting}>
              <Link href="/dashboard/schedules">Annuler</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
