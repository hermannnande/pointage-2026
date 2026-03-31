"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function BillingSuccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <CheckCircle
        className="size-16 text-green-600 dark:text-green-500"
        strokeWidth={1.5}
        aria-hidden
      />
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Paiement réussi !
        </h1>
        <p className="text-sm text-muted-foreground">
          Votre abonnement a été activé avec succès. Merci pour votre
          confiance.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard/billing">Voir mon abonnement</Link>
        </Button>
      </div>
    </div>
  );
}
