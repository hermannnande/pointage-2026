import Link from "next/link";

import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Contact — OControle",
  description:
    "Une question, une démo, un partenariat ? Notre équipe vous répond rapidement.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-12 text-center">
        <Badge variant="secondary" className="mb-3">
          Nous contacter
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Parlons de votre besoin.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground">
          Démo personnalisée, support technique ou simple question : on vous
          répond en moins de 24 h ouvrées.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <a
          href={`mailto:${siteConfig.contact.email}`}
          className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Mail className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">Email</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Réponse sous 24 h ouvrées.
          </p>
          <p className="mt-3 break-all text-sm font-medium text-primary">
            {siteConfig.contact.email}
          </p>
        </a>

        <a
          href={`tel:${siteConfig.contact.phoneRaw}`}
          className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
            <Phone className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">Téléphone</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lundi-Vendredi · 8h-18h GMT.
          </p>
          <p className="mt-3 text-sm font-medium text-primary">
            {siteConfig.contact.phone}
          </p>
        </a>

        <a
          href={siteConfig.links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md"
        >
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-600 group-hover:text-white">
            <MessageCircle className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">WhatsApp</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Le canal le plus rapide.
          </p>
          <p className="mt-3 text-sm font-medium text-emerald-700">
            Discuter sur WhatsApp →
          </p>
        </a>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-muted/20 p-6">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <h2 className="font-semibold">Adresse</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {siteConfig.contact.address}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Sur rendez-vous uniquement.
          </p>
        </div>

        <div className="rounded-2xl border bg-muted/20 p-6">
          <h2 className="font-semibold">Vous voulez voir le produit ?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Démarrez l&apos;essai gratuit en 2 minutes ou planifiez une démo
            personnalisée avec un expert.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition hover:-translate-y-0.5"
            >
              Essai gratuit
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
