import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  Bell,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Fingerprint,
  MapPin,
  Smartphone,
  Tablet,
  Users,
  Wifi,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Fonctionnalités — OControle",
  description:
    "Pointage mobile, planning, congés, rapports paie : toutes les fonctionnalités d'OControle pour piloter vos équipes terrain.",
};

const groups = [
  {
    title: "Pointage",
    icon: Fingerprint,
    items: [
      {
        icon: Smartphone,
        title: "App mobile iOS & Android",
        desc: "Pointage en 2 secondes depuis le smartphone, avec ou sans réseau.",
      },
      {
        icon: Tablet,
        title: "Mode kiosque tablette",
        desc: "Une tablette à l'accueil pour les équipes sans smartphone professionnel.",
      },
      {
        icon: MapPin,
        title: "Géolocalisation par site",
        desc: "Périmètre (geofence) personnalisable par site. Anti-fraude GPS intégré.",
      },
      {
        icon: Wifi,
        title: "Mode hors ligne",
        desc: "Les pointages sont mémorisés et synchronisés au retour du réseau.",
      },
    ],
  },
  {
    title: "Planning & congés",
    icon: CalendarCheck2,
    items: [
      {
        icon: CalendarCheck2,
        title: "Planning hebdomadaire",
        desc: "Glisser-déposer, copier la semaine précédente, gérer les rotations.",
      },
      {
        icon: Users,
        title: "Multi-équipes & multi-sites",
        desc: "Affectations par site, par service, par compétences requises.",
      },
      {
        icon: Bell,
        title: "Demandes de congés",
        desc: "Vos employés posent leurs jours, vous validez en 1 clic depuis le mobile.",
      },
      {
        icon: Clock3,
        title: "Heures supplémentaires",
        desc: "Calcul automatique selon vos règles (jour, nuit, dimanche, jours fériés).",
      },
    ],
  },
  {
    title: "Rapports & paie",
    icon: BarChart3,
    items: [
      {
        icon: BarChart3,
        title: "Tableau de bord temps réel",
        desc: "Présents, retards, absents par site. Mise à jour seconde par seconde.",
      },
      {
        icon: FileSpreadsheet,
        title: "Exports paie",
        desc: "CSV et Excel prêts à importer dans votre logiciel de paie.",
      },
      {
        icon: Clock3,
        title: "Comparaisons mensuelles",
        desc: "Évolution des heures, retards et absences sur 12 mois glissants.",
      },
      {
        icon: Users,
        title: "Audit trail complet",
        desc: "Qui a modifié quoi, quand, depuis où. Pour la conformité paie.",
      },
    ],
  },
];

export default function FonctionnalitesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-14 text-center">
        <Badge variant="secondary" className="mb-3">
          Fonctionnalités
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Une plateforme. Toute la gestion du temps.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Pointage, planning, congés, rapports : tout est connecté pour vos
          équipes terrain et votre back-office.
        </p>
      </div>

      <div className="space-y-16">
        {groups.map(({ title, icon: GroupIcon, items }) => (
          <section key={title}>
            <div className="mb-6 flex items-center gap-3">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow">
                <GroupIcon className="h-5 w-5" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map(({ icon: Icon, title: itemTitle, desc }) => (
                <div
                  key={itemTitle}
                  className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{itemTitle}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-blue-500/5 p-8">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Tout ça en un seul outil. Et c&apos;est gratuit pendant 7 jours.
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sans carte bancaire. Configuration accompagnée par un expert
              francophone.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
            >
              Démarrer gratuitement
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          Sans carte bancaire · Support FR · Annulable à tout moment
        </p>
      </div>
    </div>
  );
}
