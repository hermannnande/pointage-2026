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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createLeaveRequestAction,
  getLeaveTypesAction,
  getEmployeesForSelectAction,
  getMyEmployeeIdAction,
} from "../actions";

function countBusinessDays(start: string, end: string): number {
  if (!start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e < s) return 0;
  let count = 0;
  const d = new Date(s);
  while (d <= e) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return Math.max(count, 0);
}

type EmployeeOption = Awaited<
  ReturnType<typeof getEmployeesForSelectAction>
>[number];
type LeaveTypeRow = Awaited<ReturnType<typeof getLeaveTypesAction>>[number];

export default function NewLeaveRequestPage() {
  const router = useRouter();
  const [bootLoading, setBootLoading] = useState(true);
  const [lockedEmployeeId, setLockedEmployeeId] = useState<string | null>(
    null,
  );
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRow[]>([]);

  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFormData = useCallback(async () => {
    setBootLoading(true);
    try {
      const [myId, types] = await Promise.all([
        getMyEmployeeIdAction(),
        getLeaveTypesAction(),
      ]);
      setLeaveTypes(types.filter((t) => t.isActive));
      if (myId) {
        setLockedEmployeeId(myId);
        setEmployeeId(myId);
      } else {
        setLockedEmployeeId(null);
        const emps = await getEmployeesForSelectAction();
        setEmployees(emps);
      }
    } catch {
      toast.error("Impossible de charger le formulaire");
      setEmployees([]);
      setLeaveTypes([]);
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFormData();
  }, [loadFormData]);

  const businessDays = useMemo(
    () => countBusinessDays(startDate, endDate),
    [startDate, endDate],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const emp = lockedEmployeeId ?? employeeId;
    if (!emp) {
      setError("Veuillez sélectionner un employé.");
      return;
    }
    if (!leaveTypeId) {
      setError("Veuillez sélectionner un type de congé.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createLeaveRequestAction({
        employeeId: emp,
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
      if (result.success) {
        toast.success("Demande soumise");
        router.push("/dashboard/leaves");
      } else {
        setError(result.error ?? "Une erreur est survenue");
        toast.error(result.error ?? "Échec de l’envoi");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (bootLoading) {
    return (
      <>
        <PageHeader title="Nouvelle demande de congé" />
        <Card className="max-w-xl">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Nouvelle demande de congé" />
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Informations de la demande</CardTitle>
        </CardHeader>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <CardContent className="space-y-6">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {lockedEmployeeId ? (
              <p className="text-sm text-muted-foreground">
                La demande sera enregistrée pour votre profil employé.
              </p>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="leave-employee">
                  Employé <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={employeeId}
                  onValueChange={(v: string | null, _details: unknown) =>
                    setEmployeeId(v || "")
                  }
                >
                  <SelectTrigger id="leave-employee" className="w-full">
                    <SelectValue placeholder="Sélectionner un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="leave-type">
                Type de congé <span className="text-destructive">*</span>
              </Label>
              <Select
                value={leaveTypeId}
                onValueChange={(v: string | null, _details: unknown) =>
                  setLeaveTypeId(v || "")
                }
              >
                <SelectTrigger id="leave-type" className="w-full">
                  <SelectValue placeholder="Choisir un type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((lt) => (
                    <SelectItem key={lt.id} value={lt.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-2 shrink-0 rounded-full ring-1 ring-border"
                          style={{ backgroundColor: lt.color }}
                          aria-hidden
                        />
                        {lt.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="leave-start">
                  Date de début <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="leave-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave-end">
                  Date de fin <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="leave-end"
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {startDate && endDate && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Durée estimée
                </span>
                <Badge variant="secondary">
                  {businessDays} jour(s) ouvré(s)
                </Badge>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="leave-reason">Motif (optionnel)</Label>
              <textarea
                id="leave-reason"
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                placeholder="Précisez le contexte si besoin…"
                rows={4}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t bg-muted/50">
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              )}
              Envoyer la demande
            </Button>
            <Button variant="outline" type="button" asChild>
              <Link href="/dashboard/leaves">Annuler</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
