"use client";

import { Download, ShieldCheck, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { APK_DOWNLOAD_PATH, APK_SIZE_LABEL } from "@/lib/constants";

interface ApkInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Titre custom (ex. post-inscription : "Bienvenue ! Installez l'app"). */
  title?: string;
  /** Sous-titre custom. */
  description?: string;
}

const INSTALL_STEPS = [
  {
    step: "1",
    label: "Téléchargez le fichier",
    detail: "Appuyez sur « Télécharger l'APK » ci-dessous depuis votre téléphone Android.",
  },
  {
    step: "2",
    label: "Ouvrez le fichier",
    detail: "Une fois le téléchargement terminé, ouvrez « ocontrole.apk » depuis vos notifications ou le dossier Téléchargements.",
  },
  {
    step: "3",
    label: "Autorisez l'installation",
    detail: "Si Android demande d'autoriser les sources inconnues, appuyez sur « Paramètres » puis activez « Autoriser cette source ».",
  },
  {
    step: "4",
    label: "Installez et connectez-vous",
    detail: "Appuyez sur « Installer », ouvrez OControle et connectez-vous avec votre compte.",
  },
] as const;

/**
 * Popup guide d'installation de l'application mobile Android (APK).
 * Contrôlé par le parent : utilisé après l'inscription (onboarding) et
 * depuis la bannière du dashboard.
 */
export function ApkInstallDialog({
  open,
  onOpenChange,
  title = "Installez l'application mobile",
  description = "Suivez votre entreprise où que vous soyez et laissez vos employés pointer depuis leur téléphone.",
}: ApkInstallDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-3">
          {INSTALL_STEPS.map((s) => (
            <li key={s.step} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {s.step}
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">{s.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {s.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          Application officielle OControle · Android · {APK_SIZE_LABEL}
        </p>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="lg" className="w-full gap-2" asChild>
            <a href={APK_DOWNLOAD_PATH} download>
              <Download className="h-4 w-4" />
              Télécharger l&apos;APK
            </a>
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Téléphone ancien ou installation impossible ?{" "}
            <a
              href={`${APK_DOWNLOAD_PATH}?arch=32`}
              download
              className="underline hover:text-foreground"
            >
              Version 32-bit
            </a>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground"
            onClick={() => onOpenChange(false)}
          >
            Plus tard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
