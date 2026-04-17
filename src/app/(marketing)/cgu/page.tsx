import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Conditions générales d'utilisation — OControle",
  description:
    "Conditions générales d'utilisation et de service de la plateforme OControle.",
};

export default function CguPage() {
  const lastUpdated = "17 avril 2026";

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Légal
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Conditions générales d&apos;utilisation
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Dernière mise à jour : {lastUpdated}
        </p>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        <p>
          Les présentes conditions générales d&apos;utilisation (ci-après «&nbsp;CGU&nbsp;»)
          encadrent l&apos;accès et l&apos;utilisation de la plateforme OControle.
          En créant un compte, vous acceptez sans réserve l&apos;intégralité des
          présentes CGU.
        </p>

        <h2>1. Objet</h2>
        <p>
          OControle est une plateforme SaaS de pointage et de gestion de
          présence destinée aux entreprises. Le service permet aux utilisateurs
          autorisés d&apos;enregistrer leurs heures de travail, de gérer des
          plannings, des congés, et de produire des rapports.
        </p>

        <h2>2. Création de compte</h2>
        <p>
          L&apos;utilisateur s&apos;engage à fournir des informations exactes et
          à jour lors de l&apos;inscription. Il est responsable de la
          confidentialité de ses identifiants et de toute activité réalisée
          depuis son compte.
        </p>

        <h2>3. Utilisation du service</h2>
        <p>
          L&apos;utilisateur s&apos;engage à utiliser OControle conformément à
          la loi et aux présentes CGU. Il s&apos;interdit notamment :
        </p>
        <ul className="list-disc space-y-1.5 pl-6">
          <li>De porter atteinte à la sécurité ou à l&apos;intégrité du service.</li>
          <li>De détourner le service à des fins illicites.</li>
          <li>D&apos;extraire ou de copier les données d&apos;autres entreprises clientes.</li>
          <li>D&apos;utiliser le service pour usurper l&apos;identité d&apos;un tiers.</li>
        </ul>

        <h2>4. Période d&apos;essai et abonnement</h2>
        <p>
          OControle est proposé avec une période d&apos;essai gratuite de 7
          jours, sans engagement ni carte bancaire. À l&apos;issue de cette
          période, l&apos;accès au service nécessite la souscription à un
          abonnement payant. Les tarifs sont disponibles sur la page{" "}
          <Link href="/pricing" className="text-primary hover:underline">
            tarifs
          </Link>
          .
        </p>

        <h2>5. Résiliation</h2>
        <p>
          L&apos;utilisateur peut résilier son abonnement à tout moment depuis
          son espace de facturation. La résiliation prend effet à la fin de la
          période en cours. Aucun remboursement prorata n&apos;est dû.
        </p>

        <h2>6. Disponibilité du service</h2>
        <p>
          OControle s&apos;engage à fournir un niveau de disponibilité de 99,9 %
          mensuel hors maintenance planifiée. En cas d&apos;interruption majeure
          dépassant cet engagement, des avoirs commerciaux pourront être
          attribués sur demande.
        </p>

        <h2>7. Propriété intellectuelle</h2>
        <p>
          OControle reste la propriété exclusive de son éditeur. Les données
          créées par l&apos;utilisateur (employés, pointages, plannings)
          restent la propriété de son entreprise et peuvent être exportées à
          tout moment.
        </p>

        <h2>8. Limitation de responsabilité</h2>
        <p>
          OControle ne saurait être tenu responsable des dommages indirects, ni
          des pertes de chiffre d&apos;affaires liés à l&apos;utilisation ou à
          l&apos;impossibilité d&apos;utiliser le service. La responsabilité de
          l&apos;éditeur est limitée au montant payé par le client durant les
          12 derniers mois.
        </p>

        <h2>9. Modifications</h2>
        <p>
          Les présentes CGU peuvent être modifiées à tout moment. Toute
          modification substantielle sera notifiée à l&apos;utilisateur par
          email au moins 30 jours avant son entrée en vigueur.
        </p>

        <h2>10. Droit applicable</h2>
        <p>
          Les présentes CGU sont soumises au droit ivoirien. Tout litige relève
          de la compétence exclusive des tribunaux d&apos;Abidjan.
        </p>

        <h2>11. Contact</h2>
        <p>
          Pour toute question relative aux présentes CGU :{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-primary hover:underline"
          >
            {siteConfig.contact.email}
          </a>
        </p>
      </div>
    </div>
  );
}
