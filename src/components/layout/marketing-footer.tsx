import Link from "next/link";

import { Clock, Mail, MapPin, Phone } from "lucide-react";

import { siteConfig } from "@/config/site";

const footerLinks = {
  Produit: [
    { label: "Fonctionnalités", href: "/fonctionnalites" },
    { label: "Tarifs", href: "/pricing" },
    { label: "Sécurité", href: "/securite" },
  ],
  Ressources: [
    { label: "Centre d'aide", href: "/help" },
    { label: "Blog", href: "/blog" },
  ],
  Entreprise: [
    { label: "À propos", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],
  Légal: [
    { label: "Confidentialité", href: "/privacy" },
    { label: "CGU", href: "/cgu" },
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "RGPD", href: "/rgpd" },
  ],
};

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Link href="/" className="group inline-flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25">
                <Clock className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">OControle</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              La plateforme de pointage et gestion de présence la plus simple et
              fiable pour les entreprises africaines.
            </p>
            <div className="mt-6 space-y-2.5">
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4 shrink-0" />
                {siteConfig.contact.email}
              </a>
              <a
                href={`tel:${siteConfig.contact.phoneRaw}`}
                className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <Phone className="h-4 w-4 shrink-0" />
                {siteConfig.contact.phone}
              </a>
              <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {siteConfig.contact.address}
              </div>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold tracking-wide">{category}</h3>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} OControle. Tous droits réservés.
          </p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="inline-block h-2 w-2 rounded-full bg-success" />
            Tous les systèmes opérationnels
          </div>
        </div>
      </div>
    </footer>
  );
}
