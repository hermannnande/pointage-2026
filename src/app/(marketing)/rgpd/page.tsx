import Link from "next/link";

import { Download, Eye, Lock, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "RGPD — OControle",
  description:
    "Vos droits sur vos données personnelles : accès, rectification, suppression, portabilité.",
};

const rights = [
  {
    icon: Eye,
    title: "Droit d'accès",
    desc: "Obtenez une copie des données personnelles que nous détenons sur vous.",
  },
  {
    icon: Download,
    title: "Droit à la portabilité",
    desc: "Récupérez vos données dans un format lisible (CSV, Excel) pour les transférer ailleurs.",
  },
  {
    icon: Lock,
    title: "Droit de rectification",
    desc: "Corrigez vos informations personnelles si elles sont inexactes ou incomplètes.",
  },
  {
    icon: Trash2,
    title: "Droit à l'oubli",
    desc: "Demandez la suppression définitive de votre compte et de toutes vos données.",
  },
];

export default function RgpdPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-12">
        <Badge variant="secondary" className="mb-3">
          Conformité RGPD
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Vos données. Vos droits.
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          OControle s&apos;engage à respecter le Règlement général sur la
          protection des données (RGPD) ainsi que la loi ivoirienne n°2013-450
          relative à la protection des données à caractère personnel.
        </p>
      </div>

      <h2 className="mb-5 text-2xl font-bold tracking-tight">
        Vos 4 droits fondamentaux
      </h2>
      <div className="mb-12 grid gap-4 sm:grid-cols-2">
        {rights.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border bg-card p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground">
        <h2>Données collectées et finalités</h2>
        <p>
          OControle collecte uniquement les données nécessaires au
          fonctionnement du service : identifiants, coordonnées professionnelles,
          horaires de pointage, géolocalisation lors des pointages, historique
          des connexions. Aucune donnée n&apos;est revendue à des tiers.
        </p>

        <h2>Base légale du traitement</h2>
        <p>
          Le traitement de vos données repose sur l&apos;exécution du contrat
          conclu avec votre entreprise (employeur), votre consentement pour
          certaines données optionnelles (photo de profil), et nos obligations
          légales (conservation des données de pointage).
        </p>

        <h2>Durée de conservation</h2>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>Données de pointage : 5 ans après la fin de la relation contractuelle.</li>
          <li>Données de compte : supprimées sous 30 jours après résiliation.</li>
          <li>Logs de connexion : 12 mois.</li>
          <li>Sauvegardes : 90 jours maximum.</li>
        </ul>

        <h2>Sécurité</h2>
        <p>
          Vos données sont chiffrées en transit (HTTPS/TLS 1.3) et au repos
          (AES-256). L&apos;accès est strictement limité aux personnes
          autorisées. Toutes les actions sensibles sont enregistrées dans un
          journal d&apos;audit.
        </p>

        <h2>Sous-traitants</h2>
        <p>
          OControle s&apos;appuie sur des sous-traitants conformes au RGPD :
          Supabase (base de données, UE), Vercel (hébergement), Resend (envois
          d&apos;emails). Tous sont liés par des accords de traitement de
          données.
        </p>

        <h2>Comment exercer vos droits</h2>
        <p>
          Pour exercer l&apos;un de vos droits, écrivez à{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-primary hover:underline"
          >
            {siteConfig.contact.email}
          </a>{" "}
          en précisant votre demande. Une réponse vous sera apportée sous 30
          jours maximum. Pour la suppression complète de votre compte, vous
          pouvez aussi utiliser notre{" "}
          <Link
            href="/datadeletion"
            className="text-primary hover:underline"
          >
            page dédiée
          </Link>
          .
        </p>

        <h2>Réclamation</h2>
        <p>
          Si vous estimez que vos droits ne sont pas respectés, vous pouvez
          déposer une réclamation auprès de l&apos;Autorité de régulation des
          télécommunications de Côte d&apos;Ivoire (ARTCI) ou auprès de
          l&apos;autorité de protection des données de votre pays.
        </p>
      </div>
    </div>
  );
}
