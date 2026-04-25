import { Clock } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Politique de confidentialité — OControle",
  description: "Comment OControle collecte, utilise et protège vos données personnelles.",
};

export default function PrivacyPage() {
  const lastUpdated = "2 avril 2026";

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
          Politique de confidentialité
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dernière mise à jour : {lastUpdated}
        </p>
      </div>

      <div className="prose prose-neutral max-w-none dark:prose-invert space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-foreground [&_h3]:mt-6 [&_h3]:mb-2">
        <p>
          Chez OControle, nous prenons la protection de vos données personnelles très au sérieux.
          Cette politique de confidentialité explique comment nous collectons, utilisons, stockons
          et protégeons vos informations lorsque vous utilisez notre plateforme.
        </p>

        <h2>1. Données collectées</h2>
        <p>Nous collectons les données suivantes dans le cadre de l&apos;utilisation de OControle :</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li><strong className="text-foreground">Informations de compte</strong> : nom, prénom, adresse email, numéro de téléphone, photo de profil.</li>
          <li><strong className="text-foreground">Informations d&apos;entreprise</strong> : nom de l&apos;entreprise, secteur d&apos;activité, pays, ville, lieux de travail.</li>
          <li><strong className="text-foreground">Données de pointage</strong> : heures d&apos;entrée et de sortie, pauses, géolocalisation (avec votre consentement).</li>
          <li><strong className="text-foreground">Données de navigation</strong> : adresse IP, type de navigateur, pages consultées.</li>
          <li><strong className="text-foreground">Données de paiement</strong> : gérées par notre prestataire de paiement sécurisé (Chariow). Nous ne stockons jamais vos données bancaires.</li>
        </ul>

        <h2>2. Utilisation des données</h2>
        <p>Vos données sont utilisées pour :</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Fournir et améliorer nos services de pointage et de gestion de présence.</li>
          <li>Gérer votre compte et votre abonnement.</li>
          <li>Envoyer des notifications liées au service (alertes retard, rappels, confirmations).</li>
          <li>Générer des rapports de présence et des statistiques pour votre entreprise.</li>
          <li>Assurer la sécurité et prévenir la fraude.</li>
        </ul>

        <h2>3. Partage des données</h2>
        <p>
          Nous ne vendons jamais vos données personnelles. Vos données sont strictement isolées par entreprise
          (architecture multi-tenant). Nous pouvons partager certaines données avec :
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li><strong className="text-foreground">Votre employeur</strong> : les données de pointage sont accessibles aux administrateurs et managers autorisés de votre entreprise.</li>
          <li><strong className="text-foreground">Prestataires techniques</strong> : hébergement (Vercel), base de données (Supabase), paiement (Chariow) — uniquement pour le fonctionnement du service.</li>
          <li><strong className="text-foreground">Autorités légales</strong> : si la loi l&apos;exige.</li>
        </ul>

        <h2>4. Géolocalisation</h2>
        <p>
          La géolocalisation est utilisée uniquement pour vérifier que le pointage est effectué depuis
          le lieu de travail (géofence). Elle est collectée uniquement avec votre consentement explicite
          et n&apos;est jamais utilisée à des fins de surveillance en dehors des heures de travail.
        </p>

        <h2>5. Sécurité</h2>
        <p>Nous mettons en œuvre des mesures de sécurité robustes :</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Chiffrement des données en transit (HTTPS/TLS) et au repos.</li>
          <li>Isolation stricte des données par entreprise.</li>
          <li>Contrôle d&apos;accès basé sur les rôles (RBAC).</li>
          <li>Journalisation des accès et des modifications (audit logs).</li>
          <li>Sauvegardes régulières.</li>
        </ul>

        <h2>6. Conservation des données</h2>
        <p>
          Vos données sont conservées pendant la durée de votre abonnement actif et jusqu&apos;à 90 jours
          après la suppression de votre compte, sauf obligation légale de conservation plus longue.
        </p>

        <h2>7. Vos droits</h2>
        <p>Conformément à la réglementation applicable, vous avez le droit de :</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li><strong className="text-foreground">Accéder</strong> à vos données personnelles.</li>
          <li><strong className="text-foreground">Rectifier</strong> des données inexactes.</li>
          <li><strong className="text-foreground">Supprimer</strong> votre compte et vos données.</li>
          <li><strong className="text-foreground">Exporter</strong> vos données dans un format lisible.</li>
          <li><strong className="text-foreground">Retirer</strong> votre consentement à la géolocalisation à tout moment.</li>
        </ul>
        <p>
          Pour exercer ces droits, contactez-nous à{" "}
          <a href="mailto:ocontrolesupoport@gmail.com" className="text-primary hover:underline">ocontrolesupoport@gmail.com</a>.
        </p>

        <h2>8. Cookies</h2>
        <p>
          OControle utilise des cookies essentiels pour le fonctionnement de la plateforme
          (authentification, session). Nous n&apos;utilisons pas de cookies publicitaires ou de suivi.
        </p>

        <h2 id="mobile">9. Application mobile Android (OControle Mobile)</h2>
        <p>
          La version mobile Android d&apos;OControle (publiée sur Google Play) est soumise à des
          obligations de transparence supplémentaires. Cette section détaille spécifiquement
          les données collectées et les permissions utilisées par l&apos;application mobile.
        </p>

        <h3>9.1 Permissions Android utilisées</h3>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            <strong className="text-foreground">Localisation (ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION)</strong> :
            utilisée uniquement au moment du pointage pour vérifier que vous êtes bien sur le lieu de
            travail défini par votre employeur (géofence). La position n&apos;est pas suivie en arrière-plan
            et n&apos;est jamais utilisée à des fins publicitaires ou de surveillance hors temps de travail.
          </li>
          <li>
            <strong className="text-foreground">Caméra (CAMERA)</strong> :
            utilisée uniquement si vous prenez ou modifiez votre photo de profil, ou pour scanner un
            QR code de pointage. Aucune photo n&apos;est prise en arrière-plan.
          </li>
          <li>
            <strong className="text-foreground">Stockage / Photos (READ_MEDIA_IMAGES)</strong> :
            utilisée uniquement si vous choisissez une photo de profil depuis votre galerie.
          </li>
          <li>
            <strong className="text-foreground">Notifications (POST_NOTIFICATIONS)</strong> :
            utilisée pour vous envoyer les notifications liées au service (rappels de pointage,
            réponses à vos demandes de congé, alertes administratives). Vous pouvez les désactiver
            à tout moment depuis les réglages Android.
          </li>
          <li>
            <strong className="text-foreground">Internet (INTERNET)</strong> :
            indispensable au fonctionnement du service (synchronisation avec nos serveurs).
          </li>
        </ul>

        <h3>9.2 Données collectées via l&apos;application mobile</h3>
        <p>L&apos;application mobile collecte exactement les mêmes données que la version web :</p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Informations de compte et d&apos;entreprise (cf. section 1).</li>
          <li>Données de pointage et géolocalisation (cf. sections 1 et 4).</li>
          <li>
            <strong className="text-foreground">Diagnostic technique (Sentry, optionnel)</strong> :
            en cas de plantage de l&apos;application, nous collectons par défaut un rapport technique
            anonymisé (type d&apos;erreur, version d&apos;Android, modèle d&apos;appareil, trace d&apos;exécution)
            via Sentry afin de corriger les bugs. Aucune donnée personnelle ni de pointage n&apos;est
            envoyée. Vous pouvez désactiver totalement cette collecte à tout moment depuis
            l&apos;écran <em>Profil → À propos &amp; confidentialité → Partager les rapports de plantage</em>.
          </li>
        </ul>
        <p>
          L&apos;application mobile n&apos;utilise <strong className="text-foreground">aucun SDK
          publicitaire ni de suivi tiers</strong> (pas de Google Ads, pas de Facebook SDK,
          pas de Firebase Analytics).
        </p>

        <h3 id="account-deletion">9.3 Suppression de compte depuis l&apos;application mobile</h3>
        <p>
          Conformément aux exigences du Google Play Store, vous pouvez demander la suppression
          de votre compte directement depuis l&apos;application mobile :
        </p>
        <ol className="list-decimal space-y-1.5 pl-6">
          <li>Ouvrez l&apos;application OControle.</li>
          <li>Allez dans <em>Profil</em> (employé) ou <em>Réglages</em> (administrateur).</li>
          <li>Touchez <em>« À propos &amp; confidentialité »</em> puis <em>« Supprimer mon compte »</em>.</li>
          <li>
            L&apos;application ouvrira votre client e-mail avec une demande pré-remplie envoyée à{" "}
            <a href="mailto:ocontrolesupoport@gmail.com" className="text-primary hover:underline">
              ocontrolesupoport@gmail.com
            </a>.
          </li>
          <li>
            Nous traitons la demande sous 30 jours et vous confirmons la suppression par e-mail.
          </li>
        </ol>
        <p>
          Vous pouvez également consulter notre page dédiée :{" "}
          <Link href="/datadeletion" className="text-primary hover:underline">
            Suppression de compte et de données
          </Link>.
        </p>

        <h3>9.4 Données partagées avec des tiers (mobile)</h3>
        <p>
          Pour la version mobile, les seules entités tierces susceptibles de recevoir des données
          techniques sont :
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>
            <strong className="text-foreground">Supabase</strong> (hébergement base de données et
            authentification) — UE / États-Unis.
          </li>
          <li>
            <strong className="text-foreground">Sentry</strong> (rapports de plantage anonymisés,
            uniquement si activé) — UE / États-Unis.
          </li>
          <li>
            <strong className="text-foreground">Google Play Services</strong> (mises à jour de
            l&apos;application via le Google Play Store, gestion des notifications push).
          </li>
        </ul>

        <h2>10. Modifications</h2>
        <p>
          Nous pouvons mettre à jour cette politique de confidentialité. En cas de changement important,
          nous vous informerons par email ou par notification dans l&apos;application.
        </p>

        <h2>11. Contact</h2>
        <p>
          Pour toute question relative à cette politique, contactez-nous :<br />
          <strong className="text-foreground">Email</strong> :{" "}
          <a href="mailto:ocontrolesupoport@gmail.com" className="text-primary hover:underline">ocontrolesupoport@gmail.com</a><br />
          <strong className="text-foreground">Adresse</strong> : Abidjan, Côte d&apos;Ivoire
        </p>
      </div>

      <div className="mt-12 border-t pt-6">
        <Link href="/" className="text-sm text-primary hover:underline">
          ← Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
