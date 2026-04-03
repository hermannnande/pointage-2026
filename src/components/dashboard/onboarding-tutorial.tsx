"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Rocket,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    target: null,
    icon: Rocket,
    title: "Bienvenue sur OControle !",
    description:
      "Nous allons vous montrer les elements essentiels pour bien demarrer. C'est rapide et simple, pas d'inquietude.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    target: "[data-tour='kpi-cards']",
    icon: Users,
    title: "Vos chiffres du jour",
    description:
      "Ici, vous voyez en un coup d'oeil combien d'employes sont presents, en retard ou absents aujourd'hui.",
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    target: "[data-tour='quick-actions']",
    icon: Building2,
    title: "Actions rapides",
    description:
      "Ces raccourcis vous permettent d'ajouter un employe, configurer un site ou voir les pointages en un clic.",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    target: "[data-tour='quick-links']",
    icon: Clock,
    title: "Acces rapides",
    description:
      "Accedez directement au pointage en direct, aux rapports ou aux conges depuis ces cartes.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    target: "[data-tour='sidebar-nav']",
    icon: Calendar,
    title: "Le menu de navigation",
    description:
      "Toutes les sections sont accessibles depuis le menu : employes, sites, plannings, conges, rapports et parametres. Sur telephone, appuyez sur le menu en haut a gauche.",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    target: "[data-tour='help-bar']",
    icon: BarChart3,
    title: "Besoin d'aide ?",
    description:
      "Vous pouvez revoir ce guide a tout moment depuis cette zone, ou visiter le centre d'aide.",
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    target: null,
    icon: CheckCircle2,
    title: "Vous etes pret !",
    description:
      "Vous connaissez maintenant l'essentiel. Commencez par ajouter vos employes et configurer vos sites.",
    color: "text-green-600",
    bg: "bg-green-50",
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
}

interface ViewportRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTutorial({ onComplete }: OnboardingTutorialProps) {
  const [step, setStep] = useState(0);
  const [vpRect, setVpRect] = useState<ViewportRect | null>(null);
  const [ready, setReady] = useState(false);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const Icon = current.icon;

  const measureTarget = useCallback(() => {
    const selector = STEPS[step]?.target;
    if (!selector) {
      setVpRect(null);
      setReady(true);
      return;
    }

    const el = document.querySelector(selector);
    if (!el) {
      setVpRect(null);
      setReady(true);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });

    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const pad = 8;
      setVpRect({
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      });
      setReady(true);
    }, 400);
  }, [step]);

  useEffect(() => {
    setReady(false);
    measureTarget();
    const onResize = () => measureTarget();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measureTarget]);

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, onComplete]);

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const getTooltipStyle = (): React.CSSProperties => {
    if (!vpRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw < 640;
    const tooltipW = Math.min(360, vw - 24);

    if (isMobile) {
      const targetBottom = vpRect.top + vpRect.height;
      const spaceBelow = vh - targetBottom;
      const spaceAbove = vpRect.top;

      if (spaceBelow > 200) {
        return {
          position: "fixed",
          bottom: `${Math.max(12, vh - targetBottom - 200)}px`,
          left: `${Math.max(12, (vw - tooltipW) / 2)}px`,
          width: `${tooltipW}px`,
          maxHeight: `${Math.min(spaceBelow - 16, 260)}px`,
          overflowY: "auto",
        };
      }

      if (spaceAbove > 180) {
        return {
          position: "fixed",
          top: `${Math.max(12, vpRect.top - 200)}px`,
          left: `${Math.max(12, (vw - tooltipW) / 2)}px`,
          width: `${tooltipW}px`,
          maxHeight: `${Math.min(spaceAbove - 16, 260)}px`,
          overflowY: "auto",
        };
      }

      return {
        position: "fixed",
        bottom: "12px",
        left: "12px",
        right: "12px",
        maxHeight: "45vh",
        overflowY: "auto",
      };
    }

    const targetCenterX = vpRect.left + vpRect.width / 2;
    const targetBottom = vpRect.top + vpRect.height;
    const spaceBelow = vh - targetBottom;
    const spaceAbove = vpRect.top;

    let top: number;
    if (spaceBelow > 240) {
      top = targetBottom + 12;
    } else if (spaceAbove > 240) {
      top = vpRect.top - 220;
    } else {
      top = Math.max(16, vh - 260);
    }

    let left = targetCenterX - tooltipW / 2;
    left = Math.max(16, Math.min(left, vw - tooltipW - 16));

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${tooltipW}px`,
    };
  };

  const svgDocTop = vpRect ? vpRect.top + window.scrollY : 0;
  const svgDocLeft = vpRect ? vpRect.left + window.scrollX : 0;

  return (
    <div className="fixed inset-0 z-[100]" style={{ opacity: ready ? 1 : 0, transition: "opacity 200ms" }}>
      {/* Dark overlay with spotlight cutout */}
      <svg
        className="pointer-events-none fixed inset-0 h-full w-full"
        style={{ zIndex: 100 }}
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {vpRect && (
              <rect
                x={svgDocLeft}
                y={svgDocTop}
                width={vpRect.width}
                height={vpRect.height}
                rx={16}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#tour-mask)"
        />
      </svg>

      {/* Highlight ring around target */}
      {vpRect && (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-primary ring-offset-2 transition-all duration-300"
          style={{
            zIndex: 101,
            top: vpRect.top,
            left: vpRect.left,
            width: vpRect.width,
            height: vpRect.height,
          }}
        />
      )}

      {/* Backdrop click to dismiss */}
      <div
        className="fixed inset-0"
        style={{ zIndex: 101 }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onComplete();
        }}
      />

      {/* Tooltip card */}
      <div
        className="rounded-2xl border bg-white p-4 shadow-2xl sm:p-5"
        style={{ zIndex: 102, ...getTooltipStyle() }}
      >
        {/* Close button */}
        <button
          onClick={onComplete}
          className="absolute right-2.5 top-2.5 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Fermer le guide"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Progress dots */}
        <div className="mb-3 flex gap-1 pr-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${current.bg}`}
          >
            <Icon className={`h-5 w-5 ${current.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold leading-tight sm:text-base">{current.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {current.description}
            </p>
          </div>
        </div>

        {/* Step counter */}
        <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
          {step + 1} / {STEPS.length}
        </p>

        {/* Navigation */}
        <div className="mt-2 flex items-center justify-between gap-2">
          {isFirst ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onComplete}
              className="text-xs text-muted-foreground"
            >
              Passer
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={prev} className="text-xs">
              Precedent
            </Button>
          )}
          <Button onClick={next} size="sm" className="min-w-[90px] text-xs">
            {isLast ? "Terminer" : "Suivant"}
          </Button>
        </div>
      </div>
    </div>
  );
}
