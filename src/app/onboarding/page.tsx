"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  CrosshairIcon,
  Globe2,
  Info,
  Loader2,
  MapPin,
  Navigation,
  Rocket,
  SkipForward,
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
import { CountrySelect } from "@/components/common/country-select";

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

const RADIUS_OPTIONS = [
  { value: 50, label: "50 m — Petit local / boutique" },
  { value: 100, label: "100 m — Bureau / magasin" },
  { value: 200, label: "200 m — Bâtiment / entreprise" },
  { value: 500, label: "500 m — Grand site / campus" },
  { value: 1000, label: "1 km — Zone industrielle" },
];

type GeoStatus = "idle" | "loading" | "success" | "error" | "denied";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("company");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>("CI");
  const [companyName, setCompanyName] = useState("");

  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoAddress, setGeoAddress] = useState<string>("");
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [siteSkipped, setSiteSkipped] = useState(false);

  const currentIndex = stepsMeta.findIndex((s) => s.key === currentStep);

  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      return;
    }

    setGeoStatus("loading");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCoords({ lat, lng });
        setGeoStatus("success");

        try {
          const resp = await fetch(
            `/api/geocode?mode=reverse&lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
          );
          if (resp.ok) {
            const data = await resp.json();
            const addr = data.display;
            if (addr) setGeoAddress(addr.split(",").slice(0, 3).join(",").trim());
          }
        } catch {
          // Non-bloquant
        }
      },
      (err) => {
        if (err.code === 1) {
          setGeoStatus("denied");
        } else {
          setGeoStatus("error");
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);

  async function handleCompanySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
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

      if (!result.success) {
        setError(result.error || "Erreur lors de la création");
        return;
      }

      setCurrentStep("site");
    } catch (err) {
      console.error("Erreur onboarding entreprise:", err);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSiteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);

      const result = await createSiteAction({
        siteName: formData.get("siteName") as string,
        address: (formData.get("address") as string) || undefined,
        city: (formData.get("siteCity") as string) || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        geofenceRadius,
        workStartTime: (formData.get("workStartTime") as string) || "08:00",
        workEndTime: (formData.get("workEndTime") as string) || "17:00",
      });

      if (!result.success) {
        setError(result.error || "Erreur lors de la création du site");
        return;
      }

      await completeOnboardingAction();
      setCurrentStep("done");
    } catch (err) {
      console.error("Erreur onboarding site:", err);
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipSite() {
    setLoading(true);
    setError(null);
    try {
      await completeOnboardingAction();
      setSiteSkipped(true);
      setCurrentStep("done");
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  function goToDashboard() {
    try {
      localStorage.removeItem("ocontrole_tutorial_seen");
    } catch {}
    router.push("/dashboard?welcome=true");
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

            {/* Mini-tuto */}
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-900 dark:bg-blue-950/30">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Etape 1 sur 2 : Votre entreprise</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-600 dark:text-blue-300">
                  Renseignez simplement le nom de votre entreprise, boutique ou salon. Le secteur et la ville sont optionnels, vous pourrez les modifier plus tard dans les parametres.
                </p>
              </div>
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
                  <SelectContent className="min-w-[280px] sm:min-w-[340px]">
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
                  <CountrySelect
                    name="country"
                    value={selectedCountry || "CI"}
                    onChange={setSelectedCountry}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-sm font-medium">
                    Ville
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder="Ex: Abidjan, Dakar, Douala..."
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
                Localisez votre lieu de travail
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                La geolocalisation permet de verifier la presence de vos employes sur site
              </p>
            </div>

            {/* Mini-tuto */}
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 dark:border-blue-900 dark:bg-blue-950/30">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Etape 2 sur 2 : Votre lieu de travail</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-600 dark:text-blue-300">
                  C&apos;est l&apos;endroit ou vos employes pointent (boutique, bureau, atelier...). Vous pouvez utiliser la geolocalisation ou saisir l&apos;adresse manuellement. Vous pourrez toujours ajouter d&apos;autres sites plus tard.
                </p>
              </div>
            </div>

            {/* Bouton passer */}
            <div className="mb-5 flex items-center justify-center">
              <button
                type="button"
                onClick={handleSkipSite}
                disabled={loading}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <SkipForward className="h-4 w-4" />
                Passer, je configurerai mon site plus tard
              </button>
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

              {/* Géolocalisation */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  <Navigation className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  Position du site
                </Label>

                {geoStatus === "idle" && (
                  <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
                    <CrosshairIcon className="mx-auto h-8 w-8 text-primary/60" />
                    <p className="mt-2 text-sm font-medium">
                      Localisez votre site automatiquement
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Placez-vous dans votre boutique, bureau ou local et cliquez ci-dessous
                    </p>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="mt-3 gap-2"
                      onClick={requestGeolocation}
                    >
                      <Navigation className="h-4 w-4" />
                      Me localiser maintenant
                    </Button>
                  </div>
                )}

                {geoStatus === "loading" && (
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    <p className="mt-2 text-sm font-medium">Localisation en cours...</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Autorisez l&apos;accès à votre position dans votre navigateur
                    </p>
                  </div>
                )}

                {geoStatus === "success" && coords && (
                  <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/40">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          Position enregistrée
                        </p>
                        <p className="mt-0.5 text-xs text-green-600 dark:text-green-400">
                          {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                        </p>
                        {geoAddress && (
                          <p className="mt-1 truncate text-xs text-green-700 dark:text-green-300">
                            {geoAddress}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs text-green-700 hover:text-green-800 dark:text-green-300"
                        onClick={requestGeolocation}
                      >
                        Actualiser
                      </Button>
                    </div>
                  </div>
                )}

                {geoStatus === "denied" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Accès à la position refusé
                    </p>
                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                      Autorisez la localisation dans les paramètres de votre navigateur, ou saisissez l&apos;adresse manuellement ci-dessous.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setGeoStatus("idle")}
                    >
                      Réessayer
                    </Button>
                  </div>
                )}

                {geoStatus === "error" && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">
                      Impossible de vous localiser
                    </p>
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      Vérifiez votre connexion ou saisissez l&apos;adresse manuellement.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => setGeoStatus("idle")}
                    >
                      Réessayer
                    </Button>
                  </div>
                )}
              </div>

              {/* Rayon de géofence */}
              {coords && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    <CrosshairIcon className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                    Rayon de couverture
                  </Label>
                  <Select
                    value={String(geofenceRadius)}
                    onValueChange={(v) => setGeofenceRadius(Number(v))}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="min-w-[280px] sm:min-w-[340px]">
                      {RADIUS_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={String(r.value)}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Seuls les pointages effectués dans ce rayon seront validés
                  </p>
                </div>
              )}

              {/* Adresse manuelle (alternative ou complément) */}
              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-sm font-medium">
                  <MapPin className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  Adresse {!coords && <span className="text-xs font-normal text-muted-foreground">(si pas de géolocalisation)</span>}
                </Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="Ex: Rue des Jardins, Cocody"
                  defaultValue={geoAddress}
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
                <p className="mt-1.5 text-xs font-medium">{siteSkipped ? "0 site" : "1 site"}</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-3 text-center">
                <Users className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="mt-1.5 text-xs font-medium">0 employe</p>
              </div>
            </div>

            {siteSkipped && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/30">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                  Pensez a configurer votre premier site depuis le tableau de bord pour activer le pointage par geolocalisation.
                </p>
              </div>
            )}

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
