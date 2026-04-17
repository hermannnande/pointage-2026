import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/config/site";

export const metadata = {
  title: "Mentions légales — OControle",
  description: "Mentions légales et informations sur l'éditeur du site OControle.",
};

export default function MentionsLegalesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mb-10">
        <Badge variant="secondary" className="mb-3">
          Légal
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Mentions légales
        </h1>
      </div>

      <div className="space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
        <h2>Éditeur du site</h2>
        <p>
          <strong className="text-foreground">OControle</strong>
          <br />
          Plateforme SaaS de pointage et gestion de présence
          <br />
          {siteConfig.contact.address}
          <br />
          Email :{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-primary hover:underline"
          >
            {siteConfig.contact.email}
          </a>
          <br />
          Téléphone : {siteConfig.contact.phone}
        </p>

        <h2>Directeur de la publication</h2>
        <p>Le représentant légal d&apos;OControle.</p>

        <h2>Hébergement</h2>
        <p>
          Le site est hébergé sur <strong className="text-foreground">Vercel Inc.</strong>
          <br />
          440 N Barranca Ave #4133, Covina, CA 91723, États-Unis
          <br />
          Site web :{" "}
          <a
            href="https://vercel.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            vercel.com
          </a>
        </p>
        <p>
          La base de données est hébergée par{" "}
          <strong className="text-foreground">Supabase Inc.</strong> dans
          l&apos;Union européenne.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          L&apos;ensemble du contenu de ce site (textes, images, graphismes,
          logo, icônes, logiciels) est la propriété exclusive d&apos;OControle,
          sauf mentions contraires. Toute reproduction, représentation,
          modification ou exploitation, totale ou partielle, sans autorisation
          écrite préalable est interdite.
        </p>

        <h2>Données personnelles</h2>
        <p>
          OControle collecte et traite des données personnelles dans le respect
          de la réglementation en vigueur. Pour en savoir plus, consultez notre{" "}
          <a href="/privacy" className="text-primary hover:underline">
            politique de confidentialité
          </a>{" "}
          et notre{" "}
          <a href="/rgpd" className="text-primary hover:underline">
            page RGPD
          </a>
          .
        </p>

        <h2>Cookies</h2>
        <p>
          Le site utilise des cookies strictement nécessaires à son
          fonctionnement (authentification, préférences utilisateur) ainsi que
          des cookies de mesure d&apos;audience. Vous pouvez à tout moment
          configurer votre navigateur pour les refuser.
        </p>

        <h2>Crédits</h2>
        <p>
          Photographies : Pexels (licence libre).
          <br />
          Icônes : Lucide.
          <br />
          Polices : Geist par Vercel.
        </p>
      </div>
    </div>
  );
}
