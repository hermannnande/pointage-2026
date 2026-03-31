"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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

import { createSiteAction } from "../actions";

export default function NewSitePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [workStartTime, setWorkStartTime] = useState("08:00");
  const [workEndTime, setWorkEndTime] = useState("17:00");
  const [geofenceRadius, setGeofenceRadius] = useState(200);
  const [graceMinutes, setGraceMinutes] = useState(15);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await createSiteAction({
        name: name.trim(),
        address: address.trim() || undefined,
        city: city.trim() || undefined,
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
          <CardContent className="space-y-4">
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
                placeholder="Ex. Siège social"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="address">Adresse</Label>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="geofenceRadius">
                  Rayon géofence (mètres)
                </Label>
                <Input
                  id="geofenceRadius"
                  name="geofenceRadius"
                  type="number"
                  min={50}
                  max={5000}
                  step={1}
                  value={geofenceRadius}
                  onChange={(e) =>
                    setGeofenceRadius(Number.parseInt(e.target.value, 10) || 0)
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="graceMinutes">Tolérance (minutes)</Label>
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
