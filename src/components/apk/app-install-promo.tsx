"use client";

import { BarChart3, Bell, Clock3, MapPin, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { APK_DOWNLOAD_PATH, APK_SIZE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface AppInstallPromoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Appelé quand l'utilisateur clique « Installer l'app » (pour le tracking). */
  onInstall?: () => void;
}

/** Petit robot Android (inline — pas de dépendance externe). */
function AndroidGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M6 18a1 1 0 0 0 1 1h1v3.5a1.5 1.5 0 0 0 3 0V19h2v3.5a1.5 1.5 0 0 0 3 0V19h1a1 1 0 0 0 1-1V8H6v10ZM3.5 8A1.5 1.5 0 0 0 2 9.5v6a1.5 1.5 0 0 0 3 0v-6A1.5 1.5 0 0 0 3.5 8Zm17 0A1.5 1.5 0 0 0 19 9.5v6a1.5 1.5 0 0 0 3 0v-6A1.5 1.5 0 0 0 20.5 8ZM15.53 2.16l1.3-1.3a.5.5 0 0 0-.7-.7l-1.48 1.48A6.97 6.97 0 0 0 12 1c-.95 0-1.86.18-2.69.51L7.87.16a.5.5 0 1 0-.7.7l1.3 1.3A6.5 6.5 0 0 0 6 7h12a6.5 6.5 0 0 0-2.47-4.84ZM10 5a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Zm4 0a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
    </svg>
  );
}

const FEATURES = [
  { icon: Clock3, label: "Temps réel", color: "text-primary bg-primary/10" },
  { icon: Bell, label: "Alertes", color: "text-amber-600 bg-amber-100" },
  { icon: BarChart3, label: "Rapports", color: "text-blue-600 bg-blue-100" },
] as const;

/**
 * Popup marketing d'installation de l'application Android OControle.
 * Design aligné sur la maquette : logo, accroche, 3 atouts, aperçu
 * téléphone, gros bouton « Installer l'app ». Contrôlé par le parent
 * (cf. AppInstallPrompt qui gère l'auto-affichage + le bouton flottant).
 */
export function AppInstallPromo({
  open,
  onOpenChange,
  onInstall,
}: AppInstallPromoProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg"
      >
        {/* En-tête : logo + fermer */}
        <div className="flex items-center justify-center px-6 pt-6">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Clock3 className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">OControle</span>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 pb-2 pt-4">
          {/* Titre + aperçu téléphone côte à côte */}
          <div className="grid grid-cols-[1fr_38%] items-center gap-3">
            <div>
              <h2 className="text-2xl font-extrabold leading-[1.05] tracking-tight sm:text-3xl">
                Installez
                <br />
                OControle
              </h2>
              <div className="mt-2 h-1 w-10 rounded-full bg-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                Suivez vos équipes en temps réel.
              </p>
            </div>
            <PhoneMockup className="ml-auto w-full max-w-[150px]" />
          </div>

          {/* Atouts */}
          <ul className="mt-4 space-y-2">
            {FEATURES.map((f) => (
              <li
                key={f.label}
                className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5"
              >
                <span
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-full",
                    f.color,
                  )}
                >
                  <f.icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="px-6 pb-6 pt-2">
          <Button
            size="lg"
            className="h-14 w-full gap-2 rounded-2xl text-base font-bold"
            asChild
            onClick={onInstall}
          >
            <a href={APK_DOWNLOAD_PATH} download>
              <AndroidGlyph className="h-5 w-5" />
              Installer l&apos;app
            </a>
          </Button>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mx-auto mt-3 block text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Plus tard
          </button>

          <p className="mt-4 flex items-center justify-center gap-1.5 border-t pt-4 text-xs text-muted-foreground">
            <AndroidGlyph className="h-3.5 w-3.5 text-emerald-600" />
            Disponible sur Android · {APK_SIZE_LABEL}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Mini-aperçu du tableau de bord dans un cadre de téléphone. */
function PhoneMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] border-4 border-foreground/90 bg-background p-2 shadow-xl",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[1.25rem] bg-muted/40">
        {/* Barre appli */}
        <div className="flex items-center justify-between px-2.5 py-2">
          <span className="text-[9px] font-bold">OControle</span>
          <Bell className="h-3 w-3 text-muted-foreground" />
        </div>
        {/* Stats */}
        <div className="grid grid-cols-3 gap-1 px-2">
          {[
            { v: "112", l: "Présents", c: "text-emerald-600" },
            { v: "3", l: "Retards", c: "text-amber-600" },
            { v: "9", l: "Absents", c: "text-red-600" },
          ].map((s) => (
            <div
              key={s.l}
              className="rounded-lg bg-background px-1 py-1.5 text-center"
            >
              <p className={cn("text-sm font-extrabold leading-none", s.c)}>
                {s.v}
              </p>
              <p className="mt-0.5 text-[7px] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
        {/* Dernier pointage */}
        <div className="m-2 rounded-lg bg-background p-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-bold">Aïcha K.</span>
            <span className="text-[7px] text-muted-foreground">08:42</span>
          </div>
          <p className="text-[7px] font-medium text-emerald-600">
            Vient de pointer
          </p>
          <p className="mt-0.5 flex items-center gap-0.5 text-[7px] text-muted-foreground">
            <MapPin className="h-2 w-2" /> Site Plateau
          </p>
        </div>
      </div>
    </div>
  );
}
