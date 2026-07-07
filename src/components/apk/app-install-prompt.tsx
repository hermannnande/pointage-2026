"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

import { AppInstallPromo } from "./app-install-promo";

/** Dernière fermeture du popup (ms). Réapparaît après ce délai. */
const SEEN_KEY = "ocontrole.appInstallPromoSeenAt";
const REMIND_MS = 14 * 24 * 60 * 60 * 1000; // 14 jours

interface AppInstallPromptProps {
  /** Ouvre automatiquement le popup une fois par visiteur (défaut true). */
  autoShow?: boolean;
  /** Délai avant l'ouverture auto (ms, défaut 1800). */
  autoShowDelayMs?: number;
  /** Affiche le bouton flottant « Télécharger l'app » sur mobile (défaut true). */
  showFab?: boolean;
}

/**
 * Orchestration du téléchargement de l'app Android côté site web :
 *   - popup marketing auto-affiché une fois par visiteur (mémorisé 14 j) ;
 *   - bouton flottant persistant sur mobile qui rouvre le popup.
 *
 * À placer une fois dans un layout (marketing pour les visiteurs, dashboard
 * pour les comptes). 100 % client — aucun impact SSR/SEO.
 */
export function AppInstallPrompt({
  autoShow = true,
  autoShowDelayMs = 1800,
  showFab = true,
}: AppInstallPromptProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!autoShow) return;
    let recentlySeen = false;
    try {
      const raw = window.localStorage.getItem(SEEN_KEY);
      const at = raw ? Number(raw) : 0;
      recentlySeen = at > 0 && Date.now() - at < REMIND_MS;
    } catch {
      // localStorage indisponible : on affichera quand même une fois.
    }
    if (recentlySeen) return;
    const t = window.setTimeout(() => setOpen(true), autoShowDelayMs);
    return () => window.clearTimeout(t);
  }, [autoShow, autoShowDelayMs]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        window.localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {
        // ignore
      }
    }
  }

  return (
    <>
      <AppInstallPromo open={open} onOpenChange={handleOpenChange} />

      {showFab && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-1 ring-black/5 transition active:scale-95 sm:hidden"
          aria-label="Télécharger l'application Android OControle"
        >
          <Download className="h-4 w-4" />
          Télécharger l&apos;app
        </button>
      )}
    </>
  );
}
