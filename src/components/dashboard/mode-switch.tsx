"use client";

import { Gauge, Zap } from "lucide-react";

interface ModeSwitchProps {
  mode: "simple" | "advanced";
  onChange: (mode: "simple" | "advanced") => void;
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-primary/20 bg-white p-1.5 shadow-sm dark:bg-card">
      <button
        onClick={() => onChange("simple")}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
          mode === "simple"
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Zap className="h-4 w-4" />
        Simple
      </button>
      <button
        onClick={() => onChange("advanced")}
        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
          mode === "advanced"
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        <Gauge className="h-4 w-4" />
        Avancé
      </button>
    </div>
  );
}
