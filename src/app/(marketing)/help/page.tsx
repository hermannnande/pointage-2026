import Link from "next/link";

import {
  BarChart3,
  CalendarCheck2,
  CreditCard,
  Plus,
  Rocket,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Centre d'aide — OControle",
  description:
    "Guides, réponses aux questions fréquentes et contact support pour tirer le meilleur d'OControle.",
};

const categories = [
  {
    icon: Rocket,
    title: "Démarrage",
    items: [
      "Créer son compte et son entreprise",
      "Importer ses employés depuis un fichier",
      "Configurer ses sites et géolocalisation",
    ],
  },
  {
    icon: Smartphone,
    title: "Pointage",
    items: [
      "Pointer depuis l'application mobile",
      "Utiliser le mode kiosque sur tablette",
      "Que faire en cas d'erreur de pointage",
    ],
  },
  {
    icon: CalendarCheck2,
    title: "Plannings & congés",
    items: [
      "Créer un planning hebdomadaire",
      "Gérer les rotations et shifts",
      "Valider une demande de congé",
    ],
  },
  {
    icon: BarChart3,
    title: "Rapports & paie",
    items: [
      "Exporter les heures travaillées",
      "Configurer les heures supplémentaires",
      "Comprendre le rapport mensuel",
    ],
  },
  {
    icon: Users,
    title: "Équipes & rôles",
    items: [
      "Ajouter un manager",
      "Gérer les permissions",
      "Inviter un employé",
    ],
  },
  {
    icon: CreditCard,
    title: "Facturation",
    items: [
      "Changer d'offre",
      "Mettre à jour son moyen de paiement",
      "Récupérer ses factures",
    ],
  },
  {
    icon: Shield,
    title: "Sécurité & données",
    items: [
      "Activer la double authentification",
      "Exporter ses données",
      "Supprimer son compte",
    ],
  },
];

const faq = [
  {
    q: "Combien de temps pour démarrer ?",
    a: "Moins de 24 h. Vous créez votre compte, importez vos employés via un fichier CSV ou Excel, et vos équipes peuvent pointer le jour même.",
  },
  {
    q: "Peut-on pointer hors ligne ?",
    a: "Oui. L'application mobile enregistre les pointages localement et les synchronise dès le retour de connexion.",
  },
  {
    q: "Comment fonctionne la géolocalisation ?",
    a: "Vous définissez un périmètre (geofence) autour de chaque site. Le pointage n'est validé que si l'employé est dans la zone. Les tentatives hors zone sont signalées.",
  },
  {
    q: "Combien d'employés peut-on gérer ?",
    a: "Aucune limite technique. Nos clients vont de 5 à 1 500 employés, sur 1 à 50 sites différents.",
  },
  {
    q: "Mes données sont-elles à moi ?",
    a: "Oui. Vous pouvez exporter à tout moment l'ensemble de vos données (employés, pointages, plannings) en CSV ou Excel. Vous pouvez aussi supprimer définitivement votre compte sur simple demande.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-3">
          Centre d&apos;aide
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          On vous accompagne.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Trouvez vos réponses, ou contactez directement notre équipe support
          francophone.
        </p>
      </div>

      <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map(({ icon: Icon, title, items }) => (
          <div
            key={title}
            className="rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary/50" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mb-14">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">
          Questions fréquentes
        </h2>
        <div className="space-y-3">
          {faq.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border bg-background p-5 transition open:shadow-md"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold">
                {item.q}
                <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition group-open:rotate-45">
                  <Plus className="h-3.5 w-3.5" />
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border bg-muted/20 p-8 text-center">
        <h2 className="text-xl font-semibold">
          Vous ne trouvez pas votre réponse ?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Notre équipe support répond en moins de 24 h ouvrées.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
          >
            Écrire au support
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
          >
            Voir tous les canaux
          </Link>
        </div>
      </div>
    </div>
  );
}
