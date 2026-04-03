"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Globe2,
  Loader2,
  MapPin,
  Rocket,
  Sparkles,
  Store,
  Users,
} from "lucide-react";

import { COUNTRIES, SECTORS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  completeOnboardingAction,
  createCompanyAction,
  createSiteAction,
} from "./actions";

type Step = "company" | "site" | "done";

const stepsMeta = [
  { key: "company" as Step, label: "Entreprise", icon: Building2, description: "Identité de votre activité" },
  { key: "site" as Step, label: "Premier site", icon: MapPin, description: "Lieu de travail principal" },
  { key: "done" as Step, label: "Terminé", icon: CheckCircle2, description: "Prêt à démarrer" },
];

const sectorIcons: Record<string, string> = {
  retail: "🛍️", restaurant: "🍽️", beauty: "💇", health: "💊",
  education: "🎓", construction: "🏗️", logistics: "🚛", manufacturing: "🏭",
  services: "💼", technology: "💻", agriculture: "🌱", other: "📦",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>("CI");
  const [companyName, setCompanyName] = useState("");

  const currentIndex = stepsMeta.findIndex((s) => s.key === currentStep);

  async function handleCompanySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const country = formData.get("country") as string;
    const countryData = COUNTRIES.find((c) => c.code === country);
    const name = formData.get("companyName") as string;
    setCompanyName(name);

    const result = await createCompanyAction({
      companyName: name,
      sector: (formData.get("sector") as string) || undefined,
      country,
      city: (formData.get("city") as string) || undefined,
      timezone: countryData?.timezone || "Africa/Abidjan",
      currency: countryData?.currency || "XOF",
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error || "Erreur");
      return;
    }

    setCurrentStep("site");
  }

  async function handleSiteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    const result = await createSiteAction({
      siteName: formData.get("siteName") as string,
      address: (formData.get("address") as string) || undefined,
      city: (formData.get("siteCity") as string) || undefined,
      workStartTime: (formData.get("workStartTime") as string) || "08:00",
      workEndTime: (formData.get("workEndTime") as string) || "17:00",
    });

    setLoading(false);
    if (!result.success) {
      setError(result.error || "Erreur");
      return;
    }

    await completeOnboardingAction();
    setCurrentStep("done");
  }

  function goToDashboard() {
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {stepsMeta.map((step, i) => {
            const isActive = i === currentIndex;
            const isCompleted = i < currentIndex;
            const StepIcon = step.icon;

            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                      isCompleted
                        ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
                        : isActive
                          ? "border-primary bg-primary/10 text-primary shadow-md shadow-primary/15"
                          : "border-muted bg-muted/50 text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium transition-colors ${
                      isActive || isCompleted ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {i < stepsMeta.length - 1 && (
                  <div className="mx-3 mb-5 flex items-center">
                    <div
                      className={`h-0.5 w-12 rounded-full transition-colors duration-300 sm:w-20 ${
                        i < currentIndex ? "bg-primary" : "bg-border"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Company */}
      {currentStep === "company" && (
        <Card className="border shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Building2 className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Parlez-nous de votre entreprise
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Ces informations nous aident à personnaliser votre expérience
              </p>
            </div>

            <form onSubmit={handleCompanySubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <span className="shrink-0">⚠️</span> {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="companyName" className="text-sm font-medium">
                  Nom de l&apos;entreprise <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Ex: Boutique Awa, Salon Beauté Divine..."
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sector" className="text-sm font-medium">
                  Secteur d&apos;activité
                </Label>
                <Select name="sector">
                  <SelectTrigger id="sector" className="h-11">
                    <SelectValue placeholder="Choisir un secteur..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <span className="flex items-center gap-2">
                          <span>{sectorIcons[s.value] || "📦"}</span>
                          {s.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="country" className="text-sm font-medium">
                    <Globe2 className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                    Pays <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    name="country"
                    defaultValue="CI"
                    onValueChange={setSelectedCountry}
                  >
                    <SelectTrigger id="country" className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm font-medium">
                    Ville
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Ex: Abidjan"
                    disabled={loading}
                    className="h-11"
                  />
                </div>
              </div>

              <Button type="submit" className="mt-2 w-full gap-2" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Site */}
      {currentStep === "site" && (
        <Card className="border shadow-lg">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Store className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Votre premier lieu de travail
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Boutique, bureau, atelier — là où vos employés travaillent
              </p>
            </div>

            <form onSubmit={handleSiteSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  <span className="shrink-0">⚠️</span> {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="siteName" className="text-sm font-medium">
                  Nom du site <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="siteName"
                  name="siteName"
                  placeholder="Ex: Boutique Cocody, Bureau principal..."
                  required
                  disabled={loading}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Vous pourrez ajouter d&apos;autres sites plus tard
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm font-medium">
                  <MapPin className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  Adresse
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Ex: Rue des Jardins, Cocody"
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="siteCity" className="text-sm font-medium">
                  Ville
                </Label>
                <Input
                  id="siteCity"
                  name="siteCity"
                  placeholder="Ex: Abidjan"
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="workStartTime" className="text-sm font-medium">
                    <Clock className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                    Heure d&apos;ouverture
                  </Label>
                  <Input
                    id="workStartTime"
                    name="workStartTime"
                    type="time"
                    defaultValue="08:00"
                    disabled={loading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="workEndTime" className="text-sm font-medium">
                    <Clock className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                    Heure de fermeture
                  </Label>
                  <Input
                    id="workEndTime"
                    name="workEndTime"
                    type="time"
                    defaultValue="17:00"
                    disabled={loading}
                    className="h-11"
                  />
                </div>
              </div>

              <Button type="submit" className="mt-2 w-full gap-2" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    Terminer la configuration
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Done */}
      {currentStep === "done" && (
        <Card className="border shadow-lg">
          <CardContent className="flex flex-col items-center p-8 sm:p-10 text-center">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-success/10 shadow-lg shadow-success/10">
                <Rocket className="h-10 w-10 text-success" />
              </div>
              <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow-md">
                <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>

            <h2 className="mt-6 text-2xl font-bold tracking-tight">
              {companyName ? `${companyName} est prête !` : "Tout est prêt !"}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Votre espace est configuré. Ajoutez vos employés et commencez à suivre les présences dès maintenant.
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-5 py-3">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Essai gratuit de 14 jours activé
              </span>
            </div>

            <div className="mt-6 grid w-full grid-cols-3 gap-3">
              <div className="rounded-xl border bg-muted/30 p-3 text-center">
                <Building2 className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1.5 text-xs font-medium">1 entreprise</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-center">
                <MapPin className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1.5 text-xs font-medium">1 site</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-center">
                <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1.5 text-xs font-medium">0 employé</p>
              </div>
            </div>

            <Button onClick={goToDashboard} className="mt-8 w-full gap-2" size="lg">
              Accéder au tableau de bord
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
