"use client";

import { useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

import { useTenant } from "@/hooks/use-tenant";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { updateCompanyAction } from "./actions";

const AFRICAN_COUNTRIES = [
  "CI", "SN", "CM", "ML", "BF", "GN", "NE", "TG", "BJ", "GA",
  "CG", "CD", "TD", "CF", "MR", "DJ", "KM", "MG", "RW", "BI",
  "GH", "NG", "KE", "TZ", "UG", "ZA", "MA", "TN", "DZ", "EG",
];

const COUNTRY_LABELS: Record<string, string> = {
  CI: "Côte d'Ivoire", SN: "Sénégal", CM: "Cameroun", ML: "Mali",
  BF: "Burkina Faso", GN: "Guinée", NE: "Niger", TG: "Togo",
  BJ: "Bénin", GA: "Gabon", CG: "Congo", CD: "RD Congo",
  TD: "Tchad", CF: "Centrafrique", MR: "Mauritanie", DJ: "Djibouti",
  KM: "Comores", MG: "Madagascar", RW: "Rwanda", BI: "Burundi",
  GH: "Ghana", NG: "Nigeria", KE: "Kenya", TZ: "Tanzanie",
  UG: "Ouganda", ZA: "Afrique du Sud", MA: "Maroc", TN: "Tunisie",
  DZ: "Algérie", EG: "Égypte",
};

const TIMEZONES = [
  { value: "Africa/Abidjan", label: "Africa/Abidjan (GMT+0)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (GMT+1)" },
  { value: "Africa/Douala", label: "Africa/Douala (GMT+1)" },
  { value: "Africa/Dakar", label: "Africa/Dakar (GMT+0)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (GMT+3)" },
  { value: "Africa/Johannesburg", label: "Africa/Johannesburg (GMT+2)" },
  { value: "Africa/Casablanca", label: "Africa/Casablanca (GMT+1)" },
  { value: "Africa/Cairo", label: "Africa/Cairo (GMT+2)" },
];

const CURRENCIES = [
  { value: "XOF", label: "XOF — Franc CFA (UEMOA)" },
  { value: "XAF", label: "XAF — Franc CFA (CEMAC)" },
  { value: "NGN", label: "NGN — Naira" },
  { value: "GHS", label: "GHS — Cedi" },
  { value: "KES", label: "KES — Shilling kenyan" },
  { value: "ZAR", label: "ZAR — Rand" },
  { value: "MAD", label: "MAD — Dirham" },
  { value: "TND", label: "TND — Dinar tunisien" },
  { value: "EGP", label: "EGP — Livre égyptienne" },
  { value: "USD", label: "USD — Dollar" },
  { value: "EUR", label: "EUR — Euro" },
];

const SECTORS = [
  "retail", "restaurant", "beauty", "pharmacy", "education",
  "construction", "logistics", "manufacturing", "tech", "health",
  "finance", "agriculture", "other",
];

const SECTOR_LABELS: Record<string, string> = {
  retail: "Commerce / Retail", restaurant: "Restaurant / Café",
  beauty: "Salon de beauté", pharmacy: "Pharmacie",
  education: "Éducation / Formation", construction: "Construction / BTP",
  logistics: "Logistique / Transport", manufacturing: "Industrie / Atelier",
  tech: "Technologie / IT", health: "Santé", finance: "Finance / Banque",
  agriculture: "Agriculture", other: "Autre",
};

export default function SettingsPage() {
  const { company, isOwner } = useTenant();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(company.name);
  const [email, setEmail] = useState(company.email || "");
  const [sector, setSector] = useState(company.sector || "");
  const [country, setCountry] = useState(company.country);
  const [city, setCity] = useState(company.city || "");
  const [timezone, setTimezone] = useState(company.timezone);
  const [currency, setCurrency] = useState(company.currency);

  function handleCancel() {
    setName(company.name);
    setEmail(company.email || "");
    setSector(company.sector || "");
    setCountry(company.country);
    setCity(company.city || "");
    setTimezone(company.timezone);
    setCurrency(company.currency);
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateCompanyAction({
        name, email, sector, country, city, timezone, currency,
      });
      if (result.success) {
        toast.success("Paramètres mis à jour avec succès");
        setEditing(false);
        window.location.reload();
      } else {
        toast.error(result.error || "Erreur lors de la sauvegarde");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Personnalisez le fonctionnement de votre espace OControle."
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle>Informations entreprise</CardTitle>
              <CardDescription>
                {editing
                  ? "Modifiez les informations de votre organisation."
                  : "Données enregistrées pour votre organisation."}
              </CardDescription>
            </div>
            {isOwner && !editing && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Modifier
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-5">
            {editing ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nom de l&apos;entreprise *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nom de l'entreprise"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@entreprise.com"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Secteur</Label>
                    <Select value={sector} onValueChange={(v) => setSector(v ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un secteur" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {SECTOR_LABELS[s] || s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Pays *</Label>
                    <Select value={country} onValueChange={(v) => setCountry(v ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choisir un pays" />
                      </SelectTrigger>
                      <SelectContent>
                        {AFRICAN_COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {COUNTRY_LABELS[c] || c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: Abidjan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fuseau horaire</Label>
                    <Select value={timezone} onValueChange={(v) => setTimezone(v ?? "Africa/Abidjan")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Devise</Label>
                    <Select value={currency} onValueChange={(v) => setCurrency(v ?? "XOF")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((cur) => (
                          <SelectItem key={cur.value} value={cur.value}>
                            {cur.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 border-t pt-4">
                  <Button
                    onClick={handleSave}
                    disabled={saving || !name.trim() || !country.trim()}
                    className="gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {saving ? "Sauvegarde..." : "Enregistrer"}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={saving} className="gap-2">
                    <X className="h-4 w-4" />
                    Annuler
                  </Button>
                </div>
              </>
            ) : (
              <>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Nom de l'entreprise", value: company.name },
                    { label: "E-mail", value: company.email || "—" },
                    { label: "Secteur", value: SECTOR_LABELS[company.sector || ""] || company.sector || "—" },
                    { label: "Pays", value: COUNTRY_LABELS[company.country] || company.country || "—" },
                    { label: "Ville", value: company.city || "—" },
                    { label: "Fuseau horaire", value: company.timezone },
                    { label: "Devise", value: company.currency },
                  ].map((row) => (
                    <div key={row.label} className="space-y-1">
                      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {row.label}
                      </dt>
                      <dd className="text-sm font-medium text-foreground">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Préférences</CardTitle>
            <CardDescription>
              Notifications (aperçu — paramètres à venir).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <input
                id="pref-late-email"
                type="checkbox"
                defaultChecked
                className="mt-1 size-4 rounded border-input"
              />
              <Label htmlFor="pref-late-email" className="font-normal">
                Alertes retard par email
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <input
                id="pref-forgot-clock"
                type="checkbox"
                defaultChecked
                className="mt-1 size-4 rounded border-input"
              />
              <Label htmlFor="pref-forgot-clock" className="font-normal">
                Rappel oubli de pointage
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <input
                id="pref-daily-summary"
                type="checkbox"
                defaultChecked
                className="mt-1 size-4 rounded border-input"
              />
              <Label htmlFor="pref-daily-summary" className="font-normal">
                Résumé quotidien
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 ring-1 ring-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive">Zone sensible</CardTitle>
            <CardDescription>
              Actions irréversibles concernant votre entreprise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Supprimer l&apos;entreprise</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cette opération est définitive : toutes les données associées
                seront perdues.
              </p>
            </div>
            <Button type="button" variant="destructive" disabled>
              Supprimer définitivement
            </Button>
            <p className="text-xs text-muted-foreground">
              Cette action est irréversible et supprimera toutes les données.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
