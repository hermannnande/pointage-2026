"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
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
  getScheduleByIdAction,
  assignScheduleAction,
  getEmployeesForAssignAction,
} from "../../actions";

type EmployeeOption = Awaited<
  ReturnType<typeof getEmployeesForAssignAction>
>[number];

function todayInputDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AssignSchedulePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [scheduleName, setScheduleName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(todayInputDate);
  const [endDate, setEndDate] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [sched, emps] = await Promise.all([
      getScheduleByIdAction(id),
      getEmployeesForAssignAction(),
    ]);
    return { sched, emps };
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
        const data = await load();
        if (cancelled) return;
        if (!data?.sched) {
          setScheduleName(null);
          setNotFound(true);
          setEmployees([]);
        } else {
          setScheduleName(data.sched.name);
          setEmployees(data.emps ?? []);
        }
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les données");
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, load]);

  function toggleEmployee(empId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);

    const ids = [...selectedIds];
    if (ids.length === 0) {
      setError("Sélectionnez au moins un employé.");
      return;
    }
    if (!startDate.trim()) {
      setError("La date de début est obligatoire.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await assignScheduleAction({
        scheduleId: id,
        employeeIds: ids,
        startDate: startDate.trim(),
        endDate: endDate.trim() || undefined,
      });
      if (result.success && result.data) {
        toast.success(
          `${result.data.count} employé${result.data.count > 1 ? "s" : ""} affecté${result.data.count > 1 ? "s" : ""}`,
        );
        router.push(`/dashboard/schedules/${id}`);
        router.refresh();
      } else {
        setError(result.error ?? "Une erreur est survenue");
      }
    } catch {
      setError("Une erreur est survenue");
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

  if (notFound || scheduleName === null) {
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
      <PageHeader title="Affecter des employés" />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{scheduleName}</CardTitle>
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
              <Label>Employés</Label>
              <div className="max-h-72 overflow-y-auto rounded-lg border border-border p-2">
                {employees.length === 0 ? (
                  <p className="px-2 py-4 text-sm text-muted-foreground">
                    Aucun employé actif disponible.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {employees.map((emp) => {
                      const checked = selectedIds.has(emp.id);
                      return (
                        <li key={emp.id}>
                          <label className="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                            <input
                              type="checkbox"
                              className="mt-1 size-4 shrink-0 rounded border-input"
                              checked={checked}
                              onChange={() => toggleEmployee(emp.id)}
                            />
                            <span className="flex min-w-0 flex-1 flex-col text-sm">
                              <span className="font-medium">
                                {emp.firstName} {emp.lastName}
                              </span>
                              <span className="text-muted-foreground">
                                {emp.position ?? "—"} ·{" "}
                                {emp.site?.name ?? "Sans lieu"}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Laisser vide pour une affectation permanente
                </p>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-wrap gap-2 border-t bg-transparent">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Affectation…
                </>
              ) : (
                "Affecter"
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/schedules/${id}`}>
                <ArrowLeft className="h-4 w-4" />
                Annuler
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
