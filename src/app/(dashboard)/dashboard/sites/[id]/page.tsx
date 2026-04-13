"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CrosshairIcon,
  Loader2,
  MapPin,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { GeoLocationPicker } from "@/components/common/geo-location-picker";
import { getSitesAction, updateSiteAction } from "../actions";

const RADIUS_OPTIONS = [
  { value: 50, label: "50 m — Petit local / boutique" },
  { value: 100, label: "100 m — Bureau / magasin" },
  { value: 200, label: "200 m — Bâtiment / entreprise" },
  { value: 500, label: "500 m — Grand site / campus" },
  { value: 1000, label: "1 km — Zone industrielle" },
];

type SiteRow = Awaited<ReturnType<typeof getSitesAction>>[number];

export default function EditSitePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [site, setSite] = useState<SiteRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [workStartTime, setWorkStartTime] = useState("08:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [isActive, setIsActive] = useState(true);
  const [clockInEnabled, setClockInEnabled] = useState(true);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateFromSite = useCallback((s: SiteRow) => {
    setName(s.name);
    setAddress(s.address ?? "");
    setCity(s.city ?? "");
    setWorkStartTime(s.workStartTime ?? "08:00");
    setWorkEndTime(s.workEndTime ?? "17:00");
    setGeofenceRadius(s.geofenceRadius);
    setGraceMinutes(s.graceMinutes);
    setIsActive(s.isActive);
    setClockInEnabled(s.clockInEnabled);
    if (s.latitude != null && s.longitude != null) {
      setCoords({ lat: Number(s.latitude), lng: Number(s.longitude) });
    }
  }, []);

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
        const sites = await getSitesAction();
        if (cancelled) return;
        const found = sites.find((s) => s.id === id) ?? null;
        if (!found) {
          setSite(null);
          setNotFound(true);
        } else {
          setSite(found);
          hydrateFromSite(found);
        }
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger le site");
          setNotFound(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, hydrateFromSite]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await updateSiteAction({
        id,
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        latitude: coords?.lat,
        longitude: coords?.lng,
        workStartTime,
        workEndTime,
        geofenceRadius,
        graceMinutes,
        isActive,
        clockInEnabled,
      });
      if (result.success) {
        toast.success("Site mis à jour");
        router.refresh();
        const sites = await getSitesAction();
        const found = sites.find((s) => s.id === id) ?? null;
        if (found) {
          setSite(found);
          hydrateFromSite(found);
        }
      } else {
        setError(result.error ?? "Une erreur est survenue");
      }
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

  if (notFound || !site) {
    return (
      <>
        <PageHeader title="Site introuvable" />
        <p className="mb-4 text-sm text-muted-foreground">
          Ce site n&apos;existe pas ou vous n&apos;y avez pas accès.
        </p>
        <Button variant="outline" asChild>
          <Link href="/dashboard/sites">
            <ArrowLeft className="h-4 w-4" />
            Retour aux sites
          </Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <PageHeader title={site.name} />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>Modifier le site</CardTitle>
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
              />
            </div>

            {/* Géolocalisation */}
            <GeoLocationPicker
              coords={coords}
              onCoordsChange={setCoords}
              onAddressResolved={(addr) => { if (!address) setAddress(addr); }}
            />

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
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="city">Ville</Label>
                <Input
                  id="city"
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
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

            <div className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-4 sm:justify-start">
                <Label htmlFor="isActive" className="cursor-pointer">
                  Site actif
                </Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-start">
                <Label htmlFor="clockInEnabled" className="cursor-pointer">
                  Pointage activé
                </Label>
                <Switch
                  id="clockInEnabled"
                  checked={clockInEnabled}
                  onCheckedChange={setClockInEnabled}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-wrap gap-2 border-t bg-transparent">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard/sites">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
