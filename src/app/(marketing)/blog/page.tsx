import Link from "next/link";

import { Bell, BookOpen, Mail } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Blog — OControle",
  description:
    "Conseils, retours d'expérience et bonnes pratiques pour mieux gérer le temps de travail de vos équipes en Afrique.",
};

const upcomingTopics = [
  {
    badge: "RH",
    title:
      "Comment calculer les heures supplémentaires en Côte d'Ivoire en 2026",
    desc: "Le cadre légal, les seuils, les bonus, les pièges à éviter.",
  },
  {
    badge: "Productivité",
    title: "5 erreurs qui font perdre 60 h par mois aux managers terrain",
    desc: "Et comment un bon outil de pointage les fait disparaître en une semaine.",
  },
  {
    badge: "Cas client",
    title: "Comment Groupe Sigma a fiabilisé la paie de 180 employés",
    desc: "Avant : Excel et 3 jours de consolidation. Après : 30 minutes.",
  },
  {
    badge: "Sécurité",
    title: "Anti-fraude GPS : ce qu'il faut savoir avant de choisir un outil",
    desc: "Les techniques de fraude courantes et comment OControle les bloque.",
  },
];

export default function BlogPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-3">
          Blog
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Bientôt en ligne.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Notre blog ouvre prochainement avec des conseils pratiques pour mieux
          piloter vos équipes terrain en Afrique francophone.
        </p>
      </div>

      <div className="mb-12 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-blue-500/5 p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
          <Bell className="h-5 w-5" />
        </div>
        <h2 className="text-xl font-semibold">
          Soyez prévenu de la sortie du premier article
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Écrivez-nous, on vous ajoute à notre liste de premier lancement.
        </p>
        <a
          href={`mailto:${siteConfig.contact.email}?subject=Inscription%20blog%20OControle`}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
        >
          <Mail className="h-4 w-4" />
          M&apos;ajouter à la liste
        </a>
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">À paraître</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {upcomingTopics.map((t) => (
            <article
              key={t.title}
              className="rounded-2xl border bg-card p-6 opacity-90"
            >
              <Badge variant="outline" className="mb-2.5">
                {t.badge}
              </Badge>
              <h3 className="font-semibold leading-snug">{t.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t.desc}</p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Bientôt disponible
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-12 text-center">
        <p className="text-sm text-muted-foreground">
          En attendant, vous pouvez{" "}
          <Link href="/help" className="text-primary hover:underline">
            consulter notre centre d&apos;aide
          </Link>{" "}
          ou{" "}
          <Link href="/contact" className="text-primary hover:underline">
            nous écrire directement
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
