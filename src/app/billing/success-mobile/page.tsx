/**
 * Page de retour Chariow pour les paiements initiés DEPUIS L'APP MOBILE.
 *
 * PUBLIQUE (aucune authentification) : l'utilisateur arrive ici dans le
 * navigateur après avoir payé, alors que sa session vit dans l'app. On lui
 * dit simplement de retourner dans l'application — l'activation est faite
 * par le webhook Chariow, et l'app confirme aussi la vente au retour au
 * premier plan (POST /api/mobile/v1/owner/billing/confirm).
 */

import { CheckCircle2, Smartphone } from "lucide-react";

export const metadata = {
  title: "Paiement reçu — OControle",
};

export default function MobileBillingSuccessPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 text-center shadow-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
          <CheckCircle2 className="h-9 w-9 text-emerald-600" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">
          Paiement reçu !
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Votre abonnement OControle s&apos;active automatiquement dans
          quelques instants.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-primary/5 border border-primary/15 px-4 py-3">
          <Smartphone className="h-4 w-4 shrink-0 text-primary" />
          <p className="text-sm font-medium text-primary">
            Retournez dans l&apos;application OControle pour continuer.
          </p>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Le paiement met parfois 1 à 2 minutes à être confirmé par votre
          opérateur. Vous pouvez fermer cette page.
        </p>
      </div>
    </main>
  );
}
