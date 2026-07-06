"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { APK_DOWNLOAD_PATH } from "@/lib/constants";

import { ApkInstallDialog } from "./apk-install-dialog";

/** Clé localStorage : timestamp (ms) du dernier « masquer ». */
const DISMISS_KEY = "ocontrole.apkBannerDismissedAt";
/** La bannière réapparaît après ce délai pour re-suggérer l'installation. */
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 jours

/**
 * Bannière du dashboard invitant à installer l'application mobile Android.
 * - Masquable (mémorisé 30 jours en localStorage).
 * - CTA « Télécharger l'APK » + guide d'installation pas à pas (popup).
 */
export function MobileAppBanner() {
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      const dismissedAt = raw ? Number(raw) : 0;
      if (!dismissedAt || Date.now() - dismissedAt > DISMISS_DURATION_MS) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage indisponible (navigation privée) : masque pour la session
    }
  }

  if (!visible) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-foreground">
        <Smartphone className="size-4 shrink-0 text-primary" aria-hidden />
        <div className="flex-1 text-sm">
          <span className="font-medium">
            Installez l&apos;application mobile OControle.
          </span>{" "}
          <span className="hidden text-muted-foreground sm:inline">
            Suivez votre entreprise en temps réel et laissez vos employés
            pointer depuis leur téléphone.
          </span>
        </div>
        <Button size="sm" className="shrink-0 gap-1.5" asChild>
          <a href={APK_DOWNLOAD_PATH} download>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Télécharger l&apos;APK</span>
            <span className="sm:hidden">APK</span>
          </a>
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          onClick={() => setGuideOpen(true)}
        >
          Comment installer ?
        </Button>
        <button
          type="button"
          aria-label="Masquer"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          onClick={dismiss}
        >
          <X className="size-4" />
        </button>
      </div>

      <ApkInstallDialog open={guideOpen} onOpenChange={setGuideOpen} />
    </>
  );
}
