import Link from "next/link";

import {
  CheckCircle2,
  Eye,
  KeyRound,
  Lock,
  Server,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Sécurité — OControle",
  description:
    "Comment OControle protège vos données : chiffrement, authentification, hébergement, audit.",
};

const pillars = [
  {
    icon: Lock,
    title: "Chiffrement bout en bout",
    desc: "Toutes les communications sont chiffrées en TLS 1.3. Vos données sont chiffrées au repos en AES-256.",
  },
  {
    icon: KeyRound,
    title: "Authentification renforcée",
    desc: "Mots de passe hashés avec Argon2, sessions sécurisées par cookies HttpOnly, double authentification disponible.",
  },
  {
    icon: Server,
    title: "Hébergement européen",
    desc: "Infrastructure Supabase en Union européenne, sauvegardes quotidiennes, redondance multi-zones.",
  },
  {
    icon: Eye,
    title: "Journal d'audit complet",
    desc: "Chaque action sensible est enregistrée et consultable. Vous savez qui a fait quoi, quand, et depuis où.",
  },
  {
    icon: ShieldCheck,
    title: "Permissions par rôles",
    desc: "Manager, RH, Direction : chaque rôle a un périmètre précis. Aucune donnée n'est visible par défaut.",
  },
  {
    icon: CheckCircle2,
    title: "Conformité RGPD",
    desc: "Politique de protection des données conforme RGPD et loi ivoirienne. Exports et suppression sur simple demande.",
  },
];

const measures = [
  "Mises à jour de sécurité hebdomadaires",
  "Tests de pénétration annuels",
  "Surveillance 24/7 des incidents",
  "Plan de reprise d'activité documenté",
  "Politique de mots de passe forte par défaut",
  "Détection des connexions suspectes",
  "Anti-spoofing GPS sur les pointages mobiles",
  "Rate limiting et protection anti-bot",
];

export default function SecuritePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-3">
          Sécurité
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          La sécurité de vos données est notre priorité.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Vos données de pointage et celles de vos employés sont sensibles. On
          met le même niveau d&apos;exigence qu&apos;une banque pour les
          protéger.
        </p>
      </div>

      <div className="mb-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {pillars.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
          >
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      <div className="mb-14 rounded-2xl border bg-muted/20 p-8">
        <h2 className="text-2xl font-bold tracking-tight">Mesures concrètes</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Au-delà des grands principes, voici ce qu&apos;on fait au quotidien.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {measures.map((m) => (
            <li key={m} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border bg-card p-8 text-center">
        <h2 className="text-xl font-semibold">
          Une faille à signaler ? Une question sécurité ?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          On répond à toutes les questions sécurité en moins de 48 h.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
          >
            Contacter l&apos;équipe sécurité
          </Link>
          <Link
            href="/rgpd"
            className="inline-flex items-center rounded-full border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted"
          >
            Voir nos engagements RGPD
          </Link>
        </div>
      </div>
    </div>
  );
}
