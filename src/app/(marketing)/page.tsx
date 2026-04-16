"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Fingerprint,
  ImageIcon,
  Layers,
  MapPin,
  Monitor,
  Shield,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trackFbEvent } from "@/components/fb-pixel";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  CONFIGURATION IMAGES — Remplacez les src par vos vraies images    */
/*  Déposez vos images dans public/images/ avec les noms indiqués     */
/* ------------------------------------------------------------------ */
const IMAGES = {
  hero:             { src: "/images/hero-banner.png",            width: 1200, height: 675,  alt: "Gérante utilisant OControle dans sa boutique" },
  featureBoutique:  { src: "/images/feature-boutique-owner.png", width: 800,  height: 533,  alt: "Propriétaire de boutique utilisant OControle" },
  featureHR:        { src: "/images/feature-hr-manager.png",     width: 800,  height: 533,  alt: "Responsable RH consultant les rapports OControle" },
  featureKiosk:     { src: "/images/feature-kiosk-team.png",     width: 800,  height: 533,  alt: "Équipe utilisant le kiosque de pointage" },
  bannerCTA:        { src: "/images/banner-cta.png",             width: 1400, height: 500,  alt: "Équipe africaine professionnelle en entreprise" },
  socialProof:      { src: "/images/social-proof.png",           width: 1400, height: 400,  alt: "Entreprises africaines qui utilisent OControle" },
};
/* ------------------------------------------------------------------ */

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function AnimateIn({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={cn("transition-all duration-700 ease-out", visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function PlaceholderImage({ config, className, priority = false }: { config: typeof IMAGES.hero; className?: string; priority?: boolean }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl border-2 border-dashed border-muted-foreground/20 bg-muted/50", className)}
        style={{ aspectRatio: `${config.width}/${config.height}` }}
      >
        <div className="text-center p-6">
          <ImageIcon className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-2 text-xs font-medium text-muted-foreground/50">
            {config.width} x {config.height}px
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/40">{config.src}</p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={config.src}
      alt={config.alt}
      width={config.width}
      height={config.height}
      className={cn("h-auto w-full rounded-2xl object-cover", className)}
      priority={priority}
      onError={() => setError(true)}
    />
  );
}

const features = [
  { icon: Clock, title: "Pointage instantané", description: "Un seul bouton pour pointer. Entrée, sortie, pause — en une seconde depuis n'importe quel appareil.", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { icon: MapPin, title: "Géolocalisation & Géofence", description: "Vérification automatique que l'employé est sur le lieu de travail. Rayon configurable par site.", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  { icon: Building2, title: "Multi-sites illimités", description: "Gérez boutiques, bureaux, ateliers et dépôts depuis un seul tableau de bord centralisé.", color: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
  { icon: BarChart3, title: "Rapports automatiques", description: "Présences, retards, absences, heures sup — tout est calculé et exportable en CSV instantanément.", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { icon: Calendar, title: "Plannings & Shifts", description: "Horaires fixes, shifts matin/soir, modèles réutilisables. Assignez en un clic à vos équipes.", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { icon: Shield, title: "Sécurité de niveau bancaire", description: "Données isolées par entreprise, audit complet, chiffrement bout en bout, conformité RGPD.", color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400" },
  { icon: Smartphone, title: "Mobile-first, PWA", description: "Installable comme une app native. Optimisé pour connexions instables et appareils modestes.", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  { icon: Bell, title: "Alertes intelligentes", description: "Notifications retard, absence, oubli de pointage. Résumé quotidien par email pour les managers.", color: "bg-pink-500/10 text-pink-600 dark:text-pink-400" },
  { icon: FileText, title: "Gestion des congés", description: "Demandes, approbations, soldes, historique. Workflow complet avec notifications automatiques.", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400" },
];

const stats = [
  { value: "500+", label: "Entreprises", icon: Building2 },
  { value: "12 000+", label: "Employés gérés", icon: Users },
  { value: "99.9%", label: "Disponibilité", icon: Wifi },
  { value: "< 1 sec", label: "Temps de pointage", icon: Zap },
];

const useCases = [
  { name: "Boutiques & Commerces", icon: "🛍️" },
  { name: "Restaurants & Cafés", icon: "🍽️" },
  { name: "Salons de beauté", icon: "💇" },
  { name: "Ateliers & Usines", icon: "🏭" },
  { name: "Bureaux & PME", icon: "🏢" },
  { name: "Pharmacies", icon: "💊" },
  { name: "Écoles & Formation", icon: "🎓" },
  { name: "Entreprises multisites", icon: "🌍" },
];

const testimonials = [
  { name: "Awa Konaté", role: "Gérante, Boutique Beauté", location: "Abidjan, CI", quote: "Avant je ne savais jamais si mes vendeuses étaient à l'heure. Maintenant je vois tout en temps réel depuis mon téléphone. C'est devenu indispensable.", rating: 5 },
  { name: "Kouamé Diallo", role: "Directeur RH, PME 85 employés", location: "Douala, CM", quote: "J'ai remplacé nos fichiers Excel par OControle. Les rapports mensuels pour la paie sont prêts en un clic. On a gagné 3 jours de travail par mois.", rating: 5 },
  { name: "Fatou Sarr", role: "Manager Restaurant", location: "Dakar, SN", quote: "La gestion des shifts matin et soir est devenue tellement simple. Mes employés adorent le système. Aucune formation n'a été nécessaire.", rating: 5 },
];

const faqItems = [
  { q: "Dois-je installer une application sur les téléphones ?", a: "Non. OControle fonctionne directement dans le navigateur de n'importe quel smartphone. Vos employés n'ont rien à installer." },
  { q: "Est-ce que ça marche avec une connexion internet instable ?", a: "Oui. OControle est conçu pour l'Afrique. L'interface est ultra-légère et fonctionne même avec une connexion 2G/3G." },
  { q: "Mes données sont-elles sécurisées ?", a: "Absolument. Données isolées par entreprise, chiffrement de niveau bancaire, audit complet, conformité RGPD." },
  { q: "Quels moyens de paiement acceptez-vous ?", a: "Mobile money (Orange Money, Wave, MTN Money), cartes bancaires (Visa, Mastercard) et virements pour les entreprises." },
  { q: "Puis-je changer de plan ou annuler à tout moment ?", a: "Oui, sans engagement. 14 premiers jours gratuits sur tous les plans." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-foreground">
        <span className="text-sm font-medium sm:text-base">{q}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-all duration-300", open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  useEffect(() => {
    trackFbEvent("ViewContent", {
      content_name: "Page d'accueil OControle",
      content_category: "landing_page",
    });
  }, []);

  return (
    <>
      {/* ================================================================ */}
      {/*  SECTION 1 — HERO (texte + image)                               */}
      {/*  Image: 1200 x 675px — paysage, photo d'une gérante/manager     */}
      {/*  dans sa boutique ou son bureau avec tablette/téléphone          */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div className="mx-auto max-w-xl text-center lg:mx-0 lg:text-left">
              <AnimateIn>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  Essai gratuit 14 jours — Sans carte bancaire
                </div>
              </AnimateIn>

              <AnimateIn delay={100}>
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                  Savez-vous à quelle heure{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    vos employés arrivent
                  </span>{" "}
                  ?
                </h1>
              </AnimateIn>

              <AnimateIn delay={200}>
                <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
                  OControle est la solution de pointage la plus simple d&apos;Afrique.
                  Suivez la présence de vos équipes en temps réel, gérez les retards,
                  les absences et les congés — depuis n&apos;importe quel téléphone.
                </p>
              </AnimateIn>

              <AnimateIn delay={300}>
                <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                  <Button size="lg" className="w-full gap-2 px-8 text-base shadow-lg shadow-primary/25 sm:w-auto" asChild>
                    <Link href="/signup">
                      Commencer gratuitement
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" className="w-full px-8 text-base sm:w-auto" asChild>
                    <Link href="/pricing">Voir les tarifs</Link>
                  </Button>
                </div>
              </AnimateIn>

              <AnimateIn delay={400}>
                <p className="mt-5 text-xs text-muted-foreground sm:text-sm">
                  Rejoint par <span className="font-semibold text-foreground">500+ entreprises</span> en Côte d&apos;Ivoire, au Sénégal et au Cameroun
                </p>
              </AnimateIn>
            </div>

            <AnimateIn delay={300} className="relative">
              <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-primary/10">
                <PlaceholderImage config={IMAGES.hero} priority />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
              </div>
              <div className="absolute -bottom-4 -left-4 rounded-xl border bg-card px-4 py-3 shadow-lg sm:-bottom-6 sm:-left-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Taux de présence</p>
                    <p className="text-lg font-bold text-success">94.2%</p>
                  </div>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 2 — STATS                                              */}
      {/* ================================================================ */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <AnimateIn>
            <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
              La confiance de plus de 500 entreprises en Afrique
            </p>
          </AnimateIn>
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {stats.map((stat, i) => (
              <AnimateIn key={stat.label} delay={i * 80} className="text-center">
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary/60" />
                <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{stat.value}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">{stat.label}</div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 3 — BANNIÈRE IMPACT (fond sombre + image optionnelle)  */}
      {/*  Image (optionnelle) : 1400 x 500px — bannière panoramique      */}
      {/*  d'une équipe africaine professionnelle au travail              */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden bg-foreground text-background">
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <AnimateIn className="mx-auto max-w-3xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Arrêtez de perdre du temps avec les cahiers de pointage.{" "}
              <span className="text-primary">Digitalisez votre gestion de présence en 3 minutes.</span>
            </h2>
            <p className="mt-4 text-base text-background/70 sm:text-lg">
              Plus de 12 000 employés sont suivis chaque jour avec OControle.
              Retards détectés automatiquement. Rapports de paie en un clic.
            </p>
            <div className="mt-8">
              <Button size="lg" className="gap-2 px-8 text-base" asChild>
                <Link href="/signup">
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 4 — POUR LES GÉRANTS (texte + image)                   */}
      {/*  Image: 800 x 533px — portrait/paysage, propriétaire dans sa    */}
      {/*  boutique avec téléphone montrant l'app                         */}
      {/* ================================================================ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <AnimateIn>
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
              <PlaceholderImage config={IMAGES.featureBoutique} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
            </div>
          </AnimateIn>
          <AnimateIn delay={150}>
            <Badge variant="secondary" className="mb-4">Pour les gérants</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Gardez le contrôle de votre boutique,{" "}
              <span className="text-primary">même à distance</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Vous gérez une boutique, un salon ou un restaurant ? Avec OControle,
              vous savez exactement qui est présent, qui est en retard, et combien
              d&apos;heures chaque employé a travaillé — directement depuis votre téléphone.
            </p>
            <ul className="mt-6 space-y-3">
              {["Voir qui est présent en temps réel", "Recevoir des alertes en cas de retard", "Consulter les heures travaillées par semaine", "Aucune formation nécessaire pour vos employés"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button className="gap-2" asChild>
                <Link href="/signup">Essayer gratuitement <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 5 — POUR LES RH (image + texte, inversé)               */}
      {/*  Image: 800 x 533px — RH/manager devant laptop avec rapports   */}
      {/* ================================================================ */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <AnimateIn delay={150} className="order-2 md:order-1">
              <Badge variant="secondary" className="mb-4">Pour les RH & Managers</Badge>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                Des rapports de paie prêts{" "}
                <span className="text-primary">en un seul clic</span>
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Finies les heures passées à compiler des feuilles de présence.
                OControle calcule automatiquement les heures travaillées, les retards,
                les absences et les heures supplémentaires. Exportez tout en CSV.
              </p>
              <ul className="mt-6 space-y-3">
                {["Synthèse de présence par employé et par site", "Rapport de retards avec détails", "Export CSV en un clic pour la paie", "Gain de 3 jours de travail par mois"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button className="gap-2" asChild>
                  <Link href="/signup">Commencer mon essai <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </AnimateIn>
            <AnimateIn className="order-1 md:order-2">
              <div className="relative overflow-hidden rounded-2xl shadow-xl">
                <PlaceholderImage config={IMAGES.featureHR} />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 6 — MODE KIOSQUE (image + texte)                        */}
      {/*  Image: 800 x 533px — équipe qui pointe sur tablette/kiosque    */}
      {/* ================================================================ */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <AnimateIn>
            <div className="relative overflow-hidden rounded-2xl shadow-xl">
              <PlaceholderImage config={IMAGES.featureKiosk} />
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
            </div>
          </AnimateIn>
          <AnimateIn delay={150}>
            <Badge variant="secondary" className="mb-4">Mode Kiosque</Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Une tablette à l&apos;entrée,{" "}
              <span className="text-primary">et c&apos;est tout</span>
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Posez une tablette ou un vieux téléphone à l&apos;entrée de votre magasin
              ou restaurant. Chaque employé tape son code PIN et pointe en 2 secondes.
            </p>
            <ul className="mt-6 space-y-3">
              {["Code PIN personnel par employé", "Écran plein format sécurisé", "Parfait pour les boutiques et restaurants", "Fonctionne même hors ligne temporairement"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <Button className="gap-2" asChild>
                <Link href="/signup">Découvrir le mode kiosque <ArrowRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 7 — FONCTIONNALITÉS (grille de 9 cartes)               */}
      {/* ================================================================ */}
      <section id="features" className="scroll-mt-20 border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">Fonctionnalités</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Tout ce dont vous avez besoin,{" "}
              <span className="text-primary">rien de superflu</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Un outil complet, simple et pensé pour les réalités africaines.
            </p>
          </AnimateIn>

          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
            {features.map((feature, i) => (
              <AnimateIn key={feature.title} delay={i * 60}>
                <Card className="group h-full border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5">
                  <CardContent className="p-6">
                    <div className={cn("mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110", feature.color)}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 8 — COMMENT ÇA MARCHE (3 étapes)                       */}
      {/* ================================================================ */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">Comment ça marche</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Opérationnel en <span className="text-primary">3 minutes</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Pas besoin de technicien. Pas de formation. Pas de matériel.
            </p>
          </AnimateIn>

          <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-12">
            {[
              { step: "1", icon: Fingerprint, title: "Créez votre compte", description: "Inscrivez-vous en 30 secondes. Nommez votre entreprise, ajoutez votre premier site." },
              { step: "2", icon: Users, title: "Ajoutez vos employés", description: "Entrez vos employés un par un ou importez-les depuis un fichier CSV." },
              { step: "3", icon: Zap, title: "Vos employés pointent", description: "Chaque employé ouvre son navigateur, appuie sur un bouton. Vous voyez tout en temps réel." },
            ].map((item, i) => (
              <AnimateIn key={item.step} delay={i * 150}>
                <div className="relative text-center">
                  {i < 2 && <div className="absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-border to-transparent md:block" />}
                  <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-primary/10" />
                    <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">{item.step}</div>
                    <item.icon className="relative h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 9 — AVANT vs APRÈS                                      */}
      {/* ================================================================ */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">Pourquoi OControle</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Avant vs. <span className="text-primary">Après</span></h2>
          </AnimateIn>
          <AnimateIn delay={100} className="mt-12">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6 sm:p-8 dark:border-red-900/50 dark:bg-red-950/20">
                <p className="mb-5 text-sm font-semibold text-red-700 dark:text-red-400">Sans OControle</p>
                <ul className="space-y-3.5">
                  {["Cahier de pointage perdu ou falsifié", "Aucune idée de qui est en retard", "Calcul des heures à la main", "3 jours pour préparer la paie", "Pas de visibilité sur les sites distants", "Conflits sur les heures travaillées"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-red-800/80 dark:text-red-300/80"><span className="mt-0.5 text-red-500">✕</span>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6 sm:p-8 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <p className="mb-5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Avec OControle</p>
                <ul className="space-y-3.5">
                  {["Pointage digital infalsifiable", "Alertes retard en temps réel", "Heures calculées automatiquement", "Rapport de paie en 1 clic", "Tous les sites dans un seul dashboard", "Historique complet et auditable"].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-emerald-800/80 dark:text-emerald-300/80"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 10 — CAS D'UTILISATION                                  */}
      {/* ================================================================ */}
      <section>
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">Pour tous les métiers</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">De la petite boutique à la <span className="text-primary">grande entreprise</span></h2>
          </AnimateIn>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {useCases.map((uc, i) => (
              <AnimateIn key={uc.name} delay={i * 50}>
                <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5 transition-all hover:shadow-md sm:px-5 sm:py-4">
                  <span className="text-xl sm:text-2xl" role="img">{uc.icon}</span>
                  <span className="text-xs font-medium sm:text-sm">{uc.name}</span>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 11 — TÉMOIGNAGES                                        */}
      {/* ================================================================ */}
      <section id="testimonials" className="scroll-mt-20 border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">Témoignages</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ils ont transformé leur <span className="text-primary">gestion de présence</span></h2>
          </AnimateIn>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <AnimateIn key={t.name} delay={i * 100}>
                <Card className="h-full border bg-card transition-all hover:shadow-md">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="mb-4 flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, j) => (
                        <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                    <div className="mt-6 flex items-center gap-3 border-t pt-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{t.name.split(" ").map(n => n[0]).join("")}</div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role} — {t.location}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 12 — FAQ                                                */}
      {/* ================================================================ */}
      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">FAQ</Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Questions fréquentes</h2>
          </AnimateIn>
          <AnimateIn delay={100} className="mt-12 rounded-xl border bg-card p-1">
            <div className="px-4 sm:px-6">
              {faqItems.map((item) => (<FaqItem key={item.q} q={item.q} a={item.a} />))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ================================================================ */}
      {/*  SECTION 13 — CTA FINAL (bannière sombre)                        */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden border-t bg-foreground text-background">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/20">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Prêt à simplifier votre <span className="text-primary">pointage</span> ?
            </h2>
            <p className="mt-4 text-base text-background/70 sm:text-lg">
              Créez votre compte en 30 secondes. 14 jours gratuits. Sans carte bancaire. Sans engagement.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Button size="lg" className="w-full gap-2 px-8 text-base shadow-lg shadow-primary/25 sm:w-auto" asChild>
                <Link href="/signup">Démarrer mon essai gratuit <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full border-background/20 px-8 text-base text-background hover:bg-background/10 hover:text-background sm:w-auto" asChild>
                <Link href="/pricing">Voir les tarifs</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-background/50">
              Paiement sécurisé par Orange Money, Wave, MTN Money et carte bancaire
            </p>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
