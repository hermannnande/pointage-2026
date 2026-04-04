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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createEmployeeAction({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        matricule: undefined,
        position: position.trim() || undefined,
        siteId:
          siteId === EMPTY_SITE || !siteId ? undefined : siteId,
        contractType: contractType as (typeof CONTRACT_OPTIONS)[number]["value"],
        hireDate: hireDate.trim() || undefined,
        password: password.trim() || undefined,
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
      `Page de connexion : ${window.location.origin}/employe`,
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
                  <p className="text-sm font-medium text-primary">
                    {typeof window !== "undefined" ? window.location.origin : ""}/employe
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
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un site" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EMPTY_SITE}>Non assigné</SelectItem>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  L&apos;employé utilisera le code du site pour se connecter.
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
