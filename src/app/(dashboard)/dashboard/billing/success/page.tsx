import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { confirmSaleFromReturnAction } from "../actions";

export default async function BillingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ sale_id?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  const saleId = params.sale_id ?? params.session_id ?? null;

  let subtitle =
    "Votre paiement est en cours de confirmation. Merci pour votre confiance.";

  if (saleId) {
    const result = await confirmSaleFromReturnAction(saleId);
    if (!result.success) {
      subtitle = result.error ?? "Nous n'avons pas pu confirmer le paiement automatiquement.";
    } else if (result.data?.paymentStatus === "success") {
      subtitle = "Votre abonnement a été activé avec succès. Merci pour votre confiance.";
    } else if (result.data?.paymentStatus === "failed") {
      subtitle = "Le paiement a échoué. Vous pouvez réessayer depuis la page facturation.";
    } else {
      subtitle = "Votre paiement est en attente de confirmation. Revenez dans quelques secondes.";
    }
  }

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
          {subtitle}
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
