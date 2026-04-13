"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { GeoLocationPicker } from "@/components/common/geo-location-picker";
import { createSiteAction } from "../actions";

const RADIUS_OPTIONS = [
  { value: 50, label: "50 m — Petit local / boutique" },
  { value: 100, label: "100 m — Bureau / magasin" },
  { value: 200, label: "200 m — Bâtiment / entreprise" },
  { value: 500, label: "500 m — Grand site / campus" },
  { value: 1000, label: "1 km — Zone industrielle" },
];

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
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string>("");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

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
        if (result.data?.code) {
          setCreatedCode(result.data.code);
          setCreatedName(name.trim());
        } else {
          router.push("/dashboard/sites");
        }
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

      {createdCode ? (
        <Card className="max-w-lg border-0 shadow-lg">
          <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Site créé avec succès !</h2>
              <p className="mt-1 text-sm text-slate-500">
                Le site <span className="font-semibold">{createdName}</span> a été créé.
              </p>
            </div>
            <div className="w-full rounded-xl border-2 border-green-200 bg-green-50 p-5 text-center">
              <p className="text-sm text-slate-600">
                Les employés de ce site se connecteront avec leur <strong>numéro de téléphone</strong> et leur <strong>mot de passe</strong>.
              </p>
            </div>
            <Button className="mt-2 w-full" onClick={() => router.push("/dashboard/sites")}>
              Voir tous les sites
            </Button>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </>
  );
}
