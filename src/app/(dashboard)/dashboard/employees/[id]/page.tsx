"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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

import {
  deleteEmployeeAction,
  permanentDeleteEmployeeAction,
  getEmployeeAction,
  getSitesForSelectAction,
  updateEmployeeAction,
} from "../actions";

const CONTRACT_OPTIONS = [
  { value: "CDI", label: "CDI" },
  { value: "CDD", label: "CDD" },
  { value: "STAGE", label: "Stage" },
  { value: "FREELANCE", label: "Freelance" },
  { value: "INTERIM", label: "Intérim" },
  { value: "AUTRE", label: "Autre" },
] as const;

const EMPTY_SITE = "__none__";

type SiteOption = Awaited<ReturnType<typeof getSitesForSelectAction>>[number];
type EmployeeRecord = NonNullable<Awaited<ReturnType<typeof getEmployeeAction>>>;

function formatDateInput(d: Date | string | null | undefined) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [matricule, setMatricule] = useState("");
  const [position, setPosition] = useState("");
  const [siteId, setSiteId] = useState(EMPTY_SITE);
  const [contractType, setContractType] = useState<string>("CDI");
  const [hireDate, setHireDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [baseSalary, setBaseSalary] = useState("");
  const [salaryType, setSalaryType] = useState("MONTHLY");
  const [absencePolicy, setAbsencePolicy] = useState("DEDUCT");

  const [submitting, setSubmitting] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateFromEmployee = useCallback((emp: EmployeeRecord) => {
    setFirstName(emp.firstName);
    setLastName(emp.lastName);
    setEmail(emp.email ?? "");
    setPhone(emp.phone ?? "");
    setMatricule(emp.matricule ?? "");
    setPosition(emp.position ?? "");
    setSiteId(emp.siteId ?? EMPTY_SITE);
    setContractType(emp.contractType);
    setHireDate(formatDateInput(emp.hireDate));
    setIsActive(emp.isActive);
    setBaseSalary(emp.baseSalary != null ? String(emp.baseSalary) : "");
    setSalaryType(emp.salaryType ?? "MONTHLY");
    setAbsencePolicy(emp.absencePolicy ?? "DEDUCT");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSitesLoading(true);
      try {
        const data = await getSitesForSelectAction();
        if (!cancelled) setSites(data);
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les sites");
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

  const loadEmployee = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    try {
      const emp = await getEmployeeAction(id);
      if (!emp) {
        setNotFound(true);
        return;
      }
      hydrateFromEmployee(emp);
    } catch {
      toast.error("Impossible de charger l'employé");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id, hydrateFromEmployee]);

  useEffect(() => {
    void loadEmployee();
  }, [loadEmployee]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await updateEmployeeAction({
        id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        matricule: matricule.trim() || undefined,
        position: position.trim() || undefined,
        siteId: siteId === EMPTY_SITE || !siteId ? "" : siteId,
        contractType: contractType as (typeof CONTRACT_OPTIONS)[number]["value"],
        hireDate: hireDate.trim() || undefined,
        isActive,
        baseSalary: baseSalary ? parseInt(baseSalary) : undefined,
        salaryType: salaryType as "MONTHLY" | "DAILY" | "HOURLY",
        absencePolicy: absencePolicy as "DEDUCT" | "PAID" | "TOLERATED",
      });
      if (result.success) {
        toast.success("Employé mis à jour");
        void loadEmployee();
      } else {
        setError(result.error ?? "Une erreur est survenue");
        toast.error(result.error ?? "Échec de la mise à jour");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (!id) return;
    if (
      !window.confirm(
        "Désactiver cet employé ? Il n'apparaîtra plus comme actif dans les listes.",
      )
    ) {
      return;
    }
    setDeactivating(true);
    try {
      const result = await deleteEmployeeAction(id);
      if (result.success) {
        toast.success("Employé désactivé");
        router.push("/dashboard/employees");
      } else {
        toast.error(result.error ?? "Échec de la désactivation");
      }
    } finally {
      setDeactivating(false);
    }
  }

  async function handlePermanentDelete() {
    if (!id) return;
    const fullName = `${firstName} ${lastName}`.trim() || "cet employé";
    if (
      !window.confirm(
        `Supprimer définitivement "${fullName}" ?\n\nCette action est irréversible. Toutes les données de pointage liées seront aussi supprimées.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const result = await permanentDeleteEmployeeAction(id);
      if (result.success) {
        toast.success("Employé supprimé définitivement");
        router.push("/dashboard/employees");
      } else {
        toast.error(result.error ?? "Échec de la suppression");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (!id) {
    return (
      <p className="text-sm text-muted-foreground">
        Identifiant manquant.
      </p>
    );
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Chargement…" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement de l'employé…
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <PageHeader title="Employé introuvable" />
        <Button variant="outline" asChild>
          <Link href="/dashboard/employees">Retour à la liste</Link>
        </Button>
      </>
    );
  }

  const fullName = `${firstName} ${lastName}`.trim() || "Employé";

  return (
    <>
      <PageHeader title={fullName} />
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/employees">← Retour</Link>
        </Button>
      </div>
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Modifier l'employé</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}
            <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
              <div className="space-y-1">
                <Label htmlFor="isActive">Compte actif</Label>
                <p className="text-xs text-muted-foreground">
                  Les employés inactifs restent enregistrés mais sont marqués
                  comme inactifs.
                </p>
              </div>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  maxLength={100}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Nom *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  required
                  maxLength={100}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  maxLength={30}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="matricule">Matricule</Label>
                <Input
                  id="matricule"
                  name="matricule"
                  maxLength={50}
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">Poste</Label>
                <Input
                  id="position"
                  name="position"
                  maxLength={100}
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Site</Label>
                <Select
                  value={siteId}
                  onValueChange={(v) => setSiteId(v || EMPTY_SITE)}
                  disabled={sitesLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SITE}>Non assigné</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Type de contrat</Label>
                <Select
                  value={contractType}
                  onValueChange={(v) => setContractType(v || "CDI")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hireDate">Date d&apos;embauche</Label>
              <Input
                id="hireDate"
                name="hireDate"
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>

            {/* Paie & Absence */}
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Paie & Gestion des absences
                <span className="ml-2 text-xs font-normal text-muted-foreground">(optionnel)</span>
              </p>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">
                Définissez le salaire et comment les absences impactent la rémunération.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="baseSalary">Salaire de base (XOF)</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    min={0}
                    placeholder="Ex: 150000"
                    value={baseSalary}
                    onChange={(e) => setBaseSalary(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Type de salaire</Label>
                  <Select value={salaryType} onValueChange={setSalaryType}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensuel</SelectItem>
                      <SelectItem value="DAILY">Journalier</SelectItem>
                      <SelectItem value="HOURLY">Horaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Politique d&apos;absence</Label>
                  <Select value={absencePolicy} onValueChange={setAbsencePolicy}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEDUCT">Déduite du salaire</SelectItem>
                      <SelectItem value="PAID">Absence payée</SelectItem>
                      <SelectItem value="TOLERATED">Absence tolérée</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {absencePolicy === "DEDUCT" && "Chaque jour d'absence réduit le salaire"}
                    {absencePolicy === "PAID" && "L'employé est payé même en cas d'absence"}
                    {absencePolicy === "TOLERATED" && "Les absences n'impactent pas le salaire"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-transparent">
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={submitting || deactivating || deleting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-amber-600 hover:border-amber-400 hover:bg-amber-50"
                disabled={submitting || deactivating || deleting || !isActive}
                onClick={() => void handleDeactivate()}
              >
                {deactivating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Désactivation…
                  </>
                ) : (
                  "Désactiver"
                )}
              </Button>
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={submitting || deactivating || deleting}
              onClick={() => void handlePermanentDelete()}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
