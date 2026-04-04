"use client";

import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BillingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-10 text-amber-500" strokeWidth={1.5} />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">
          Impossible de charger la facturation
        </h2>
        <p className="text-sm text-muted-foreground">
          Une erreur est survenue. Veuillez réessayer.
        </p>
      </div>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
