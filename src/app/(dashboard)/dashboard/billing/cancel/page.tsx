"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BillingCancelPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <AlertTriangle
        className="size-16 text-amber-600 dark:text-amber-500"
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Paiement annulé
        </h1>
        <p className="text-sm text-muted-foreground">
          Le paiement n&apos;a pas abouti. Vous pouvez réessayer à tout
          moment.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/dashboard/billing">Réessayer</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
      </div>
    </div>
  );
}
