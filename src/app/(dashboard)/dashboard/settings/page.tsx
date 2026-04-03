"use client";

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
import { Label } from "@/components/ui/label";

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

export default function SettingsPage() {
  const { company } = useTenant();

  const rows: { label: string; value: string }[] = [
    { label: "Nom de l'entreprise", value: displayValue(company.name) },
    { label: "E-mail", value: displayValue(company.email) },
    { label: "Secteur", value: displayValue(company.sector) },
    { label: "Pays", value: displayValue(company.country) },
    { label: "Ville", value: displayValue(company.city) },
    { label: "Fuseau horaire", value: displayValue(company.timezone) },
    { label: "Devise", value: displayValue(company.currency) },
  ];

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Personnalisez le fonctionnement de votre espace OControle."
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informations entreprise</CardTitle>
            <CardDescription>
              Données enregistrées pour votre organisation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-2">
              {rows.map((row) => (
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
            <p className="border-t pt-4 text-xs text-muted-foreground">
              Contactez le support pour modifier ces informations.
            </p>
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
