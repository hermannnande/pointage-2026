import Link from "next/link";

import { Heart, Rocket, Shield, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "À propos — OControle",
  description:
    "OControle est né du constat qu'aucun outil de pointage n'était vraiment adapté aux entreprises africaines. On le construit depuis Abidjan.",
};

const values = [
  {
    icon: Users,
    title: "Conçu pour le terrain",
    desc: "Nos clients sont des PME africaines avec des équipes mobiles, multi-sites, parfois sans réseau stable.",
  },
  {
    icon: Rocket,
    title: "Simple, vraiment simple",
    desc: "Si une fonctionnalité demande une formation, c'est qu'on l'a mal pensée. On retravaille jusqu'à ce que ça soit évident.",
  },
  {
    icon: Shield,
    title: "Vos données vous appartiennent",
    desc: "Hébergement sécurisé, exports à la demande, suppression sur simple email. Pas de revente, jamais.",
  },
  {
    icon: Heart,
    title: "Support francophone",
    desc: "Une vraie équipe en Côte d'Ivoire qui comprend votre contexte, vos contraintes et votre langue.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-12">
        <Badge variant="secondary" className="mb-3">
          À propos
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          On construit l&apos;outil de pointage qu&apos;on aurait aimé avoir.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          OControle est né en 2025, à Abidjan, du constat que les entreprises
          africaines méritaient mieux que des fichiers Excel ou des logiciels
          pensés pour New York. On bâtit une plateforme simple, fiable et
          adaptée aux réalités du terrain.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {values.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-2xl border bg-card p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border bg-muted/20 p-8">
        <h2 className="text-xl font-semibold">Notre mission</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Donner à chaque dirigeant africain une vue claire et fiable sur le
          temps de travail de ses équipes, où qu&apos;elles soient, quoi
          qu&apos;il arrive. Et faire en sorte que la paie ne soit plus jamais
          un casse-tête.
        </p>
      </div>

      <div className="mt-10 flex flex-col items-center gap-4 rounded-2xl border bg-card p-8 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="text-lg font-semibold">Vous voulez en savoir plus ?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Écrivez-nous, on prend le temps de vous répondre.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
        >
          Nous contacter
        </Link>
      </div>
    </div>
  );
}
