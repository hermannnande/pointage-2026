import { Clock, Trash2 } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Suppression des données — OControle",
  description: "Instructions pour demander la suppression de vos données OControle.",
};

export default function DataDeletionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-10">
        <Link href="/" className="mb-8 inline-flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Clock className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">OControle</span>
        </Link>
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Suppression des données
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comment demander la suppression de vos données personnelles
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
        <div className="flex gap-4 rounded-xl border bg-card p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Demander la suppression de vos données</h2>
            <p className="mt-2">
              Si vous souhaitez supprimer votre compte OControle et toutes les données personnelles
              associées, vous pouvez le faire de deux manières :
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border p-6">
            <h3 className="text-base font-semibold text-foreground">Option 1 : Depuis votre compte</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>Connectez-vous à votre compte OControle.</li>
              <li>Allez dans <strong className="text-foreground">Paramètres</strong>.</li>
              <li>Dans la section &quot;Zone de danger&quot;, cliquez sur <strong className="text-foreground">Supprimer mon compte</strong>.</li>
              <li>Confirmez la suppression.</li>
            </ol>
            <p className="mt-3">
              Toutes vos données personnelles seront supprimées dans un délai de 30 jours.
            </p>
          </div>

          <div className="rounded-xl border p-6">
            <h3 className="text-base font-semibold text-foreground">Option 2 : Par email</h3>
            <p className="mt-3">
              Envoyez un email à{" "}
              <a href="mailto:contact@ocontrole.com" className="text-primary hover:underline">
                contact@ocontrole.com
              </a>{" "}
              avec :
            </p>
            <ul className="mt-3 list-disc space-y-1.5 pl-6">
              <li>L&apos;objet : &quot;Demande de suppression de données&quot;</li>
              <li>L&apos;adresse email de votre compte OControle</li>
              <li>Le nom de votre entreprise (si applicable)</li>
            </ul>
            <p className="mt-3">
              Nous traiterons votre demande sous 30 jours et vous enverrons une confirmation.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
          <h3 className="text-base font-semibold text-foreground">Données supprimées</h3>
          <p className="mt-2">La suppression inclut :</p>
          <ul className="mt-3 list-disc space-y-1.5 pl-6">
            <li>Votre profil et informations personnelles</li>
            <li>Vos données de connexion via Facebook ou Google</li>
            <li>Vos données de pointage et de présence</li>
            <li>Vos demandes de congés</li>
          </ul>
          <p className="mt-3">
            Certaines données anonymisées peuvent être conservées à des fins statistiques,
            conformément à notre{" "}
            <Link href="/privacy" className="text-primary hover:underline">politique de confidentialité</Link>.
          </p>
        </div>
      </div>

      <div className="mt-12 border-t pt-6">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
