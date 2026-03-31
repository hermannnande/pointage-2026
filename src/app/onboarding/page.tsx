"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  Building2,
  CheckCircle2,
  Loader2,
  MapPin,
} from "lucide-react";

import { COUNTRIES, SECTORS } from "@/lib/constants";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

const steps: { key: Step; label: string; icon: typeof Building2 }[] = [
  { key: "company", label: "Entreprise", icon: Building2 },
  { key: "site", label: "Premier site", icon: MapPin },
  { key: "done", label: "Terminé", icon: CheckCircle2 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<string | null>("CI");

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  async function handleCompanySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const country = formData.get("country") as string;
    const countryData = COUNTRIES.find((c) => c.code === country);

    const result = await createCompanyAction({
      companyName: formData.get("companyName") as string,
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
      {/* Progress */}
      <div className="mb-6 flex items-center justify-center gap-2">
        {steps.map((step, i) => (
          <div key={step.key} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i <= currentIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < currentIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`hidden text-sm font-medium sm:inline ${
                i <= currentIndex
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-8 sm:w-12 ${
                  i < currentIndex ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step: Company */}
      {currentStep === "company" && (
        <Card>
          <CardHeader className="text-center">
            <h2 className="text-xl font-bold">Votre entreprise</h2>
            <p className="text-sm text-muted-foreground">
              Parlez-nous de votre activité
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="companyName">Nom de l&apos;entreprise *</Label>
                <Input
                  id="companyName"
                  name="companyName"
                  placeholder="Ex: Boutique Awa"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector">Secteur d&apos;activité</Label>
                <Select name="sector">
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Sélectionnez un secteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {SECTORS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="country">Pays *</Label>
                  <Select
                    name="country"
                    defaultValue="CI"
                    onValueChange={setSelectedCountry}
                  >
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Ex: Abidjan"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Continuer"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step: Site */}
      {currentStep === "site" && (
        <Card>
          <CardHeader className="text-center">
            <h2 className="text-xl font-bold">Votre premier lieu de travail</h2>
            <p className="text-sm text-muted-foreground">
              Où se trouve votre activité ?
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSiteSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="siteName">Nom du site *</Label>
                <Input
                  id="siteName"
                  name="siteName"
                  placeholder="Ex: Boutique Cocody, Bureau principal..."
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Ex: Rue des Jardins, Cocody"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteCity">Ville</Label>
                <Input
                  id="siteCity"
                  name="siteCity"
                  placeholder="Ex: Abidjan"
                  disabled={loading}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="workStartTime">Heure d&apos;ouverture</Label>
                  <Input
                    id="workStartTime"
                    name="workStartTime"
                    type="time"
                    defaultValue="08:00"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workEndTime">Heure de fermeture</Label>
                  <Input
                    id="workEndTime"
                    name="workEndTime"
                    type="time"
                    defaultValue="17:00"
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  "Continuer"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step: Done */}
      {currentStep === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="mt-5 text-xl font-bold">Tout est prêt !</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Votre espace est configuré. Vous pouvez maintenant ajouter vos
              employés et commencer à suivre la présence.
            </p>
            <div className="mt-2 rounded-lg bg-muted px-4 py-2 text-xs text-muted-foreground">
              Essai gratuit de 14 jours activé
            </div>
            <Button onClick={goToDashboard} className="mt-6 w-full" size="lg">
              Accéder au tableau de bord
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
