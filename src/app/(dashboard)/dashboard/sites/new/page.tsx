"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CrosshairIcon,
  Loader2,
  MapPin,
  Navigation,
} from "lucide-react";
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

import { createSiteAction } from "../actions";

const RADIUS_OPTIONS = [
  { value: 50, label: "50 m — Petit local / boutique" },
  { value: 100, label: "100 m — Bureau / magasin" },
  { value: 200, label: "200 m — Bâtiment / entreprise" },
  { value: 500, label: "500 m — Grand site / campus" },
  { value: 1000, label: "1 km — Zone industrielle" },
];

type GeoStatus = "idle" | "loading" | "success" | "error" | "denied";

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [workStartTime, setWorkStartTime] = useState("08:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [geoStatus, setGeoStatus] = useState<GeoStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
          );
          if (resp.ok) {
            const data = await resp.json();
            const addr = data.display_name;
            if (addr && !address) {
              setAddress(addr.split(",").slice(0, 3).join(",").trim());
            }
          }
        } catch {
          // Non-bloquant
        }
      },
      (err) => {
        setGeoStatus(err.code === 1 ? "denied" : "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, [address]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createSiteAction({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        workStartTime,
        workEndTime,
        geofenceRadius,
        graceMinutes,
      });
      if (result.success) {
        toast.success("Site créé avec succès");
        router.push("/dashboard/sites");
      } else {
        setError(result.error ?? "Une erreur est survenue");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader title="Nouveau site" />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Informations du site</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                name="name"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. Boutique Cocody, Bureau principal..."
              />
            </div>

            {/* Géolocalisation */}
            <div className="space-y-3">
              <Label>
                <Navigation className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                Position GPS du site
              </Label>

              {geoStatus === "idle" && (
                <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-5 text-center">
                  <CrosshairIcon className="mx-auto h-8 w-8 text-primary/60" />
                  <p className="mt-2 text-sm font-medium">
                    Localisez votre site automatiquement
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Placez-vous sur le lieu de travail et cliquez ci-dessous
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
                    Autorisez l&apos;accès à votre position
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

              {(geoStatus === "denied" || geoStatus === "error") && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {geoStatus === "denied" ? "Accès à la position refusé" : "Impossible de vous localiser"}
                  </p>
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    Saisissez l&apos;adresse manuellement ci-dessous.
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

            {/* Rayon de couverture */}
            <div className="grid gap-2">
              <Label>
                <CrosshairIcon className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                Rayon de couverture
              </Label>
              <Select
                value={String(geofenceRadius)}
                onValueChange={(v) => setGeofenceRadius(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="address">
                  <MapPin className="mr-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  Adresse
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rue et numéro"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ville"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="workStartTime">Heure de début</Label>
                <Input
                  id="workStartTime"
                  name="workStartTime"
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="workEndTime">Heure de fin</Label>
                <Input
                  id="workEndTime"
                  name="workEndTime"
                  type="time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="graceMinutes">Tolérance retard (minutes)</Label>
              <Input
                id="graceMinutes"
                name="graceMinutes"
                type="number"
                min={0}
                max={120}
                step={1}
                value={graceMinutes}
                onChange={(e) =>
                  setGraceMinutes(Number.parseInt(e.target.value, 10) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">
                Nombre de minutes de retard tolérées avant que l&apos;employé soit marqué en retard
              </p>
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
                "Créer le site"
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/sites">Annuler</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
