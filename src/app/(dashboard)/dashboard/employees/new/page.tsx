"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, Info, Loader2 } from "lucide-react";
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

import { createEmployeeAction, getSitesForSelectAction } from "../actions";

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

interface CreatedCredentials {
  matricule: string;
  siteCode: string | null;
  password: string;
  siteName: string;
  employeeName: string;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [position, setPosition] = useState("");
  const [siteId, setSiteId] = useState(EMPTY_SITE);
  const [contractType, setContractType] = useState<string>("CDI");
  const [hireDate, setHireDate] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [baseSalary, setBaseSalary] = useState("");
  const [salaryType, setSalaryType] = useState("MONTHLY");
  const [absencePolicy, setAbsencePolicy] = useState("DEDUCT");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSitesLoading(true);
      try {
        const data = await getSitesForSelectAction();
        if (!cancelled) {
          setSites(data);
          if (data.length === 1) {
            setSiteId(data[0].id);
          }
        }
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (siteId === EMPTY_SITE || !siteId) {
      setError("Veuillez sélectionner un site. L'employé a besoin d'un code de site pour se connecter.");
      toast.error("Un site est obligatoire pour créer un employé");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createEmployeeAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        matricule: undefined,
        position: position.trim() || undefined,
        siteId,
        contractType: contractType as (typeof CONTRACT_OPTIONS)[number]["value"],
        hireDate: hireDate.trim() || undefined,
        password: password.trim() || undefined,
        baseSalary: baseSalary ? parseInt(baseSalary) : undefined,
        salaryType: salaryType as "MONTHLY" | "DAILY" | "HOURLY",
        absencePolicy: absencePolicy as "DEDUCT" | "PAID" | "TOLERATED",
      });
      if (result.success && result.data) {
        toast.success("Employé créé avec succès");

        const selectedSite = sites.find((s) => s.id === siteId);

        setCredentials({
          matricule: result.data.matricule,
          siteCode: result.data.siteCode,
          password: password.trim(),
          siteName: selectedSite?.name || "",
          employeeName: `${firstName.trim()} ${lastName.trim()}`,
        });
      } else {
        setError(result.error ?? "Une erreur est survenue");
        toast.error(result.error ?? "Échec de la création");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyCredentials() {
    if (!credentials) return;
    const text = [
      `=== Identifiants de connexion ===`,
      `Employé : ${credentials.employeeName}`,
      credentials.siteCode ? `Code du site : ${credentials.siteCode}` : "",
      `Matricule : ${credentials.matricule}`,
      credentials.password ? `Mot de passe : ${credentials.password}` : "",
      ``,
      credentials.siteCode
        ? `Page de connexion : ${window.location.origin}/employe?code=${credentials.siteCode}`
        : `Page de connexion : ${window.location.origin}/employe`,
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Identifiants copiés !");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (credentials) {
    return (
      <>
        <PageHeader title="Employé créé !" />
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              Identifiants de connexion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4">
              <p className="mb-3 text-sm font-medium text-muted-foreground">
                Communiquez ces informations à votre employé pour qu&apos;il puisse se connecter et pointer :
              </p>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Employé
                  </span>
                  <p className="text-lg font-semibold">{credentials.employeeName}</p>
                </div>

                {credentials.siteCode && (
                  <div>
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Code du site
                    </span>
                    <p className="font-mono text-2xl font-bold tracking-wider text-primary">
                      {credentials.siteCode}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Matricule
                  </span>
                  <p className="font-mono text-lg font-semibold">
                    {credentials.matricule}
                  </p>
                </div>

                {credentials.password && (
                  <div>
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      Mot de passe
                    </span>
                    <p className="font-mono text-lg font-semibold">
                      {credentials.password}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    Page de connexion
                  </span>
                  <p className="text-sm font-medium text-primary break-all">
                    {typeof window !== "undefined" ? window.location.origin : ""}/employe
                    {credentials.siteCode ? `?code=${credentials.siteCode}` : ""}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Notez bien ces informations. Le mot de passe ne pourra plus être affiché après avoir quitté cette page.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t bg-transparent">
            <Button onClick={handleCopyCredentials} variant="outline" className="gap-2">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier les identifiants"}
            </Button>
            <Button asChild>
              <Link href="/dashboard/employees">Retour aux employés</Link>
            </Button>
          </CardFooter>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Nouvel employé"
        description="Ajoutez un employé et définissez son mot de passe pour qu'il puisse pointer."
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Informations de l&apos;employé</CardTitle>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Prénom *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  required
                  maxLength={100}
                  placeholder="Prénom de l'employé"
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
                  placeholder="Nom de famille"
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
                  placeholder="optionnel"
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
                  placeholder="optionnel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="position">Poste</Label>
                <Input
                  id="position"
                  name="position"
                  maxLength={100}
                  placeholder="Ex: Vendeur, Caissier..."
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Site *</Label>
                <Select
                  value={siteId}
                  onValueChange={(v) => setSiteId(v || EMPTY_SITE)}
                  disabled={sitesLoading}
                >
                  <SelectTrigger className={`w-full ${siteId === EMPTY_SITE ? "border-destructive" : ""}`}>
                    <SelectValue placeholder="Choisir un site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SITE} disabled>
                      — Sélectionnez un site —
                    </SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Obligatoire — L&apos;employé utilisera le code du site pour se connecter.
                </p>
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

            {/* Paie & Absence (optionnel) */}
            <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
              <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                Paie & Gestion des absences
                <span className="ml-2 text-xs font-normal text-muted-foreground">(optionnel)</span>
              </p>
              <p className="mb-3 mt-1 text-xs text-muted-foreground">
                Configurez le salaire pour inclure cet employé dans le calcul de la paie.
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

            {/* Mot de passe employe */}
            <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
              <Label htmlFor="password" className="text-base font-semibold">
                Mot de passe de l&apos;employé *
              </Label>
              <p className="mb-3 mt-1 text-sm text-muted-foreground">
                Créez un mot de passe que vous donnerez à l&apos;employé pour qu&apos;il puisse se connecter et pointer.
              </p>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={4}
                  maxLength={50}
                  placeholder="Minimum 4 caractères"
                  className="pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t bg-transparent">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Création…
                </>
              ) : (
                "Créer l'employé"
              )}
            </Button>
            <Button variant="outline" asChild disabled={submitting}>
              <Link href="/dashboard/employees">Annuler</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
