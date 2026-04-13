"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote, Calculator, Calendar, CheckCircle, Clock, Download,
  FileText, Loader2, Plus, Settings2, Trash2, Users, AlertTriangle,
  ChevronRight, Lock, Eye,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  getPayrollPeriodsAction,
  getPayrollPeriodAction,
  createPayrollPeriodAction,
  calculatePayrollAction,
  updatePeriodStatusAction,
  deletePayrollPeriodAction,
  getPayrollConfigAction,
  updatePayrollConfigAction,
  getPayrollSummaryAction,
  updatePayrollEntryAction,
} from "./actions";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Brouillon", color: "bg-slate-100 text-slate-700" },
  CALCULATED: { label: "Calculée", color: "bg-blue-100 text-blue-700" },
  VALIDATED: { label: "Validée", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Clôturée", color: "bg-purple-100 text-purple-700" },
};

const ABSENCE_LABELS: Record<string, string> = {
  DEDUCT: "Déduite du salaire",
  PAID: "Payée",
  TOLERATED: "Tolérée",
};

function fmtXOF(n: number) {
  return n.toLocaleString("fr-FR") + " XOF";
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

type PayrollPeriodRow = Awaited<ReturnType<typeof getPayrollPeriodsAction>>["periods"][number];
type PayrollPeriodDetail = NonNullable<Awaited<ReturnType<typeof getPayrollPeriodAction>>>;
type PayrollConfig = Awaited<ReturnType<typeof getPayrollConfigAction>>;
type PayrollSummary = Awaited<ReturnType<typeof getPayrollSummaryAction>>;

export default function PayrollPage() {
  const [tab, setTab] = useState<"periods" | "detail" | "config">("periods");
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PayrollPeriodRow[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriodDetail | null>(null);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [config, setConfig] = useState<PayrollConfig>(null);

  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [creating, setCreating] = useState(false);

  const [calculating, setCalculating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [configForm, setConfigForm] = useState({
    workingDaysPerMonth: 26,
    workingHoursPerDay: 8,
    overtimeRate: 1.5,
    lateDeductionEnabled: false,
    lateThresholdMinutes: 15,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [entryBonuses, setEntryBonuses] = useState(0);
  const [entryDeductions, setEntryDeductions] = useState(0);
  const [entryNotes, setEntryNotes] = useState("");

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPayrollPeriodsAction();
      setPeriods(data.periods);
    } catch {
      toast.error("Erreur lors du chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const c = await getPayrollConfigAction();
      setConfig(c);
      if (c) {
        setConfigForm({
          workingDaysPerMonth: c.workingDaysPerMonth,
          workingHoursPerDay: c.workingHoursPerDay,
          overtimeRate: c.overtimeRate,
          lateDeductionEnabled: c.lateDeductionEnabled,
          lateThresholdMinutes: c.lateThresholdMinutes,
        });
      }
    } catch {
      /* no config yet */
    }
  }, []);

  useEffect(() => {
    void loadPeriods();
    void loadConfig();
  }, [loadPeriods, loadConfig]);

  async function openPeriodDetail(periodId: string) {
    setLoading(true);
    try {
      const [period, sum] = await Promise.all([
        getPayrollPeriodAction(periodId),
        getPayrollSummaryAction(periodId),
      ]);
      setSelectedPeriod(period);
      setSummary(sum);
      setTab("detail");
    } catch {
      toast.error("Erreur lors du chargement de la période");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePeriod() {
    if (!newLabel || !newStart || !newEnd) return;
    setCreating(true);
    try {
      const result = await createPayrollPeriodAction({
        label: newLabel,
        startDate: newStart,
        endDate: newEnd,
      });
      if (result.success) {
        toast.success("Période créée");
        setShowNewDialog(false);
        setNewLabel("");
        setNewStart("");
        setNewEnd("");
        await loadPeriods();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleCalculate(periodId: string) {
    setCalculating(true);
    try {
      const result = await calculatePayrollAction(periodId);
      if (result.success) {
        toast.success(`Paie calculée pour ${result.data?.count} employé(s)`);
        await openPeriodDetail(periodId);
      } else {
        toast.error(result.error ?? "Erreur");
      }
    } finally {
      setCalculating(false);
    }
  }

  async function handleStatusChange(periodId: string, status: "VALIDATED" | "CLOSED") {
    setActionLoading(true);
    try {
      const result = await updatePeriodStatusAction(periodId, status);
      if (result.success) {
        toast.success(status === "VALIDATED" ? "Période validée" : "Période clôturée");
        await openPeriodDetail(periodId);
      } else {
        toast.error(result.error ?? "Erreur");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeletePeriod(periodId: string) {
    if (!window.confirm("Supprimer cette période et toutes ses fiches de paie ?")) return;
    setActionLoading(true);
    try {
      const result = await deletePayrollPeriodAction(periodId);
      if (result.success) {
        toast.success("Période supprimée");
        setTab("periods");
        await loadPeriods();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      const result = await updatePayrollConfigAction(configForm);
      if (result.success) {
        toast.success("Configuration enregistrée");
        await loadConfig();
      } else {
        toast.error(result.error ?? "Erreur");
      }
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleSaveEntry() {
    if (!editingEntry) return;
    try {
      const result = await updatePayrollEntryAction({
        entryId: editingEntry,
        bonuses: entryBonuses,
        deductions: entryDeductions,
        notes: entryNotes || undefined,
      });
      if (result.success) {
        toast.success("Fiche mise à jour");
        setEditingEntry(null);
        if (selectedPeriod) await openPeriodDetail(selectedPeriod.id);
      } else {
        toast.error(result.error ?? "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
  }

  // ─── Render ────────────────────────────────────────────────

  if (loading && periods.length === 0) {
    return (
      <>
        <PageHeader title="Paie" description="Gestion des salaires basée sur la présence" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Paie"
        description="Calculez les salaires en fonction des jours de présence"
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b pb-2">
        <Button
          variant={tab === "periods" ? "default" : "ghost"}
          size="sm"
          onClick={() => { setTab("periods"); setSelectedPeriod(null); }}
        >
          <Calendar className="mr-2 h-4 w-4" />
          Périodes
        </Button>
        {selectedPeriod && (
          <Button variant={tab === "detail" ? "default" : "ghost"} size="sm" onClick={() => setTab("detail")}>
            <FileText className="mr-2 h-4 w-4" />
            {selectedPeriod.label}
          </Button>
        )}
        <Button variant={tab === "config" ? "default" : "ghost"} size="sm" onClick={() => setTab("config")}>
          <Settings2 className="mr-2 h-4 w-4" />
          Configuration
        </Button>
      </div>

      {/* ═══ TAB: Periods List ═══ */}
      {tab === "periods" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Périodes de paie</h2>
            <Button onClick={() => setShowNewDialog(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle période
            </Button>
          </div>

          {periods.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Banknote className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <p className="text-sm font-medium text-muted-foreground">Aucune période de paie</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Créez une période pour commencer à calculer les salaires.
                </p>
                <Button onClick={() => setShowNewDialog(true)} className="mt-4 gap-2" size="sm">
                  <Plus className="h-4 w-4" />
                  Créer la première période
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {periods.map((p) => {
                const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.DRAFT;
                return (
                  <Card
                    key={p.id}
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    onClick={() => openPeriodDetail(p.id)}
                  >
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{p.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(p.startDate)} — {fmtDate(p.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className={st.color}>
                          {st.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {p._count.entries} fiche{p._count.entries > 1 ? "s" : ""}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Period Detail ═══ */}
      {tab === "detail" && selectedPeriod && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{selectedPeriod.label}</h2>
              <p className="text-sm text-muted-foreground">
                {fmtDate(selectedPeriod.startDate)} — {fmtDate(selectedPeriod.endDate)}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedPeriod.status === "DRAFT" && (
                <Button size="sm" className="gap-2" onClick={() => handleCalculate(selectedPeriod.id)} disabled={calculating}>
                  {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                  Calculer la paie
                </Button>
              )}
              {selectedPeriod.status === "CALCULATED" && (
                <>
                  <Button size="sm" variant="outline" className="gap-2" onClick={() => handleCalculate(selectedPeriod.id)} disabled={calculating}>
                    {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                    Recalculer
                  </Button>
                  <Button size="sm" className="gap-2" onClick={() => handleStatusChange(selectedPeriod.id, "VALIDATED")} disabled={actionLoading}>
                    <CheckCircle className="h-4 w-4" />
                    Valider
                  </Button>
                </>
              )}
              {selectedPeriod.status === "VALIDATED" && (
                <Button size="sm" className="gap-2" onClick={() => handleStatusChange(selectedPeriod.id, "CLOSED")} disabled={actionLoading}>
                  <Lock className="h-4 w-4" />
                  Clôturer
                </Button>
              )}
              {selectedPeriod.status !== "CLOSED" && (
                <Button size="sm" variant="destructive" className="gap-2" onClick={() => handleDeletePeriod(selectedPeriod.id)} disabled={actionLoading}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Users className="mx-auto mb-1 h-5 w-5 text-blue-500" />
                  <p className="text-2xl font-bold">{summary.employeeCount}</p>
                  <p className="text-xs text-muted-foreground">Employés</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Banknote className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
                  <p className="text-lg font-bold">{fmtXOF(summary.totalGross)}</p>
                  <p className="text-xs text-muted-foreground">Salaire brut</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <AlertTriangle className="mx-auto mb-1 h-5 w-5 text-red-500" />
                  <p className="text-lg font-bold">{fmtXOF(summary.totalDeductions)}</p>
                  <p className="text-xs text-muted-foreground">Déductions</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <Clock className="mx-auto mb-1 h-5 w-5 text-amber-500" />
                  <p className="text-lg font-bold">{fmtXOF(summary.totalBonuses)}</p>
                  <p className="text-xs text-muted-foreground">Primes HS</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="mx-auto mb-1 h-5 w-5 text-green-600" />
                  <p className="text-lg font-bold text-green-700">{fmtXOF(summary.totalNet)}</p>
                  <p className="text-xs text-muted-foreground">Net à payer</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Entries Table */}
          {selectedPeriod.entries.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center">
                <Calculator className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Aucune fiche de paie. Cliquez sur &quot;Calculer la paie&quot; pour générer les fiches.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Seuls les employés avec un salaire de base configuré seront inclus.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left font-medium">Employé</th>
                      <th className="px-3 py-3 text-center font-medium">Présent</th>
                      <th className="px-3 py-3 text-center font-medium">Absent</th>
                      <th className="px-3 py-3 text-center font-medium">Politique abs.</th>
                      <th className="px-3 py-3 text-right font-medium">Base</th>
                      <th className="px-3 py-3 text-right font-medium">Brut</th>
                      <th className="px-3 py-3 text-right font-medium">Déduc.</th>
                      <th className="px-3 py-3 text-right font-medium">Primes</th>
                      <th className="px-3 py-3 text-right font-medium text-green-700">Net</th>
                      <th className="px-3 py-3 text-center font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPeriod.entries.map((entry) => {
                      const emp = entry.employee;
                      const absLabel = ABSENCE_LABELS[entry.absencePolicy] ?? entry.absencePolicy;
                      const absColor =
                        entry.absencePolicy === "DEDUCT"
                          ? "text-red-600"
                          : entry.absencePolicy === "PAID"
                            ? "text-green-600"
                            : "text-amber-600";

                      return (
                        <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/20">
                          <td className="px-4 py-3">
                            <p className="font-medium">{emp.lastName} {emp.firstName}</p>
                            <p className="text-xs text-muted-foreground">
                              {emp.matricule ?? ""} {emp.site?.name ? `· ${emp.site.name}` : ""}
                            </p>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-semibold text-green-600">{entry.daysPresent}j</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-semibold ${entry.daysAbsent > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                              {entry.daysAbsent}j
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs font-medium ${absColor}`}>{absLabel}</span>
                          </td>
                          <td className="px-3 py-3 text-right text-muted-foreground">
                            {fmtXOF(entry.baseSalary)}
                          </td>
                          <td className="px-3 py-3 text-right font-medium">{fmtXOF(entry.grossSalary)}</td>
                          <td className="px-3 py-3 text-right text-red-500">
                            {entry.deductions > 0 ? `-${fmtXOF(entry.deductions)}` : "—"}
                          </td>
                          <td className="px-3 py-3 text-right text-amber-600">
                            {entry.bonuses > 0 ? `+${fmtXOF(entry.bonuses)}` : "—"}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-green-700">
                            {fmtXOF(entry.netSalary)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {selectedPeriod.status !== "CLOSED" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingEntry(entry.id);
                                  setEntryBonuses(entry.bonuses);
                                  setEntryDeductions(entry.deductions);
                                  setEntryNotes(entry.notes ?? "");
                                }}
                              >
                                <Settings2 className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Eye className="mx-auto h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══ TAB: Config ═══ */}
      {tab === "config" && (
        <div className="max-w-xl space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings2 className="h-5 w-5" />
                Configuration de la paie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Jours ouvrés / mois</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    value={configForm.workingDaysPerMonth}
                    onChange={(e) => setConfigForm((f) => ({ ...f, workingDaysPerMonth: parseInt(e.target.value) || 26 }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Heures / jour</Label>
                  <Input
                    type="number"
                    min={1}
                    max={24}
                    step={0.5}
                    value={configForm.workingHoursPerDay}
                    onChange={(e) => setConfigForm((f) => ({ ...f, workingHoursPerDay: parseFloat(e.target.value) || 8 }))}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Taux heures supplémentaires (multiplicateur)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  step={0.25}
                  value={configForm.overtimeRate}
                  onChange={(e) => setConfigForm((f) => ({ ...f, overtimeRate: parseFloat(e.target.value) || 1.5 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Ex : 1.5 = les heures sup sont payées 1.5x le taux normal
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Déduction pour retards</Label>
                  <p className="text-xs text-muted-foreground">
                    Déduire automatiquement les minutes de retard du salaire
                  </p>
                </div>
                <Switch
                  checked={configForm.lateDeductionEnabled}
                  onCheckedChange={(v) => setConfigForm((f) => ({ ...f, lateDeductionEnabled: v }))}
                />
              </div>
              {configForm.lateDeductionEnabled && (
                <div className="grid gap-2">
                  <Label>Tolérance retard (minutes / jour)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={configForm.lateThresholdMinutes}
                    onChange={(e) => setConfigForm((f) => ({ ...f, lateThresholdMinutes: parseInt(e.target.value) || 0 }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Les retards en dessous de ce seuil ne seront pas déduits
                  </p>
                </div>
              )}
              <Button onClick={handleSaveConfig} disabled={savingConfig} className="w-full gap-2">
                {savingConfig ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Enregistrer la configuration
              </Button>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Configuration par employé</p>
                  <p className="mt-1 text-xs text-amber-700">
                    Le salaire de base et la politique d&apos;absence se configurent individuellement sur chaque fiche employé
                    (menu Employés → modifier). Seuls les employés avec un salaire de base défini apparaîtront dans le calcul de la paie.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══ Dialog: New Period ═══ */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle période de paie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Libellé</Label>
              <Input
                placeholder="Ex: Paie Mars 2026"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Date début</Label>
                <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Date fin</Label>
                <Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Annuler</Button>
            <Button onClick={handleCreatePeriod} disabled={creating || !newLabel || !newStart || !newEnd} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Dialog: Edit Entry ═══ */}
      <Dialog open={!!editingEntry} onOpenChange={(v) => { if (!v) setEditingEntry(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuster la fiche de paie</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Primes / Bonus (XOF)</Label>
              <Input
                type="number"
                min={0}
                value={entryBonuses}
                onChange={(e) => setEntryBonuses(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Déductions supplémentaires (XOF)</Label>
              <Input
                type="number"
                min={0}
                value={entryDeductions}
                onChange={(e) => setEntryDeductions(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Input
                placeholder="Remarque optionnelle"
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Annuler</Button>
            <Button onClick={handleSaveEntry} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
