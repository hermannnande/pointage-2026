"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  CalendarCheck2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Factory,
  Fingerprint,
  HeartPulse,
  MapPin,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  UtensilsCrossed,
  Users,
  Zap,
} from "lucide-react";

import { trackFbEvent } from "@/components/fb-pixel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DELAY_CLASSES = ["", "delay-100", "delay-200", "delay-300", "delay-400"] as const;
function delayClass(i: number): string {
  return DELAY_CLASSES[i % DELAY_CLASSES.length] ?? "";
}

const HERO_PORTRAIT =
  "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1400";
const BENTO_RETAIL =
  "https://images.pexels.com/photos/4473415/pexels-photo-4473415.jpeg?auto=compress&cs=tinysrgb&w=1400";
const BENTO_TEAM =
  "https://images.pexels.com/photos/6457543/pexels-photo-6457543.jpeg?auto=compress&cs=tinysrgb&w=1400";
const BENTO_MOBILE =
  "https://images.pexels.com/photos/4476635/pexels-photo-4476635.jpeg?auto=compress&cs=tinysrgb&w=1400";
const TESTIMONIAL_HR =
  "https://images.pexels.com/photos/8297224/pexels-photo-8297224.jpeg?auto=compress&cs=tinysrgb&w=1000";
const TESTIMONIAL_OPS =
  "https://images.pexels.com/photos/5907409/pexels-photo-5907409.jpeg?auto=compress&cs=tinysrgb&w=1000";
const TESTIMONIAL_DG =
  "https://images.pexels.com/photos/5668886/pexels-photo-5668886.jpeg?auto=compress&cs=tinysrgb&w=1000";

const sectors = [
  { icon: Store, label: "Retail" },
  { icon: UtensilsCrossed, label: "Restauration" },
  { icon: HeartPulse, label: "Santé" },
  { icon: Briefcase, label: "Services" },
  { icon: Factory, label: "Industrie" },
];

const heroStats = [
  { value: "350+", label: "Entreprises actives" },
  { value: "12 000+", label: "Employés suivis" },
  { value: "99,9%", label: "Disponibilité" },
  { value: "2 min", label: "Pour pointer" },
];

const showcase = [
  {
    tag: "01 · Pointage",
    title: "Vos équipes pointent en 2 secondes.",
    desc: "Mobile, web ou kiosque. Géolocalisation par site, photo facultative, anti-fraude intégré.",
    bullets: [
      "Reconnaissance automatique du site",
      "Pointage hors-ligne resynchronisé",
      "Alertes retards en temps réel",
    ],
    side: "mobile" as const,
  },
  {
    tag: "02 · Planning",
    title: "Planifiez la semaine en quelques clics.",
    desc: "Créez les horaires, affectez les équipes, dupliquez la semaine et gérez les congés sans Excel.",
    bullets: [
      "Vue hebdo claire par site et équipe",
      "Templates récurrents et rotations",
      "Validation des congés en 1 clic",
    ],
    side: "planning" as const,
  },
  {
    tag: "03 · Rapports",
    title: "La paie part sur des chiffres fiables.",
    desc: "Heures travaillées, retards, absences, heures sup : tout est consolidé et exportable.",
    bullets: [
      "Exports CSV / Excel prêts paie",
      "Comparaisons mensuelles et site par site",
      "Audit trail complet pour la conformité",
    ],
    side: "reports" as const,
  },
];

const testimonials = [
  {
    img: TESTIMONIAL_HR,
    alt: "Aminata Koné, DRH à Abidjan",
    name: "Aminata Koné",
    role: "DRH · Groupe Sigma",
    city: "Abidjan, Côte d'Ivoire",
    quote:
      "Avant OControle, on consolidait les présences à la main. Aujourd'hui, je vois les retards et les absences dès le matin. On gagne 3 jours par mois.",
  },
  {
    img: TESTIMONIAL_OPS,
    alt: "Jean-Paul Ndzi, Chef d'exploitation à Douala",
    name: "Jean-Paul Ndzi",
    role: "Chef d'exploitation · BTP",
    city: "Douala, Cameroun",
    quote:
      "Le planning change souvent chez nous. Les superviseurs savent tout de suite qui est affecté sur quel site. Plus de doublons, plus d'oublis.",
  },
  {
    img: TESTIMONIAL_DG,
    alt: "Moussa Traoré, Directeur administratif à Bamako",
    name: "Moussa Traoré",
    role: "Directeur administratif",
    city: "Bamako, Mali",
    quote:
      "Les rapports nous ont permis de fiabiliser les heures avant la paie. Moins de contestations et les managers ont enfin les mêmes chiffres.",
  },
];

const faq = [
  {
    q: "Combien de temps pour déployer OControle ?",
    a: "Moins de 24 h en moyenne. Vous importez vos employés, vous créez vos sites, et vos équipes peuvent pointer le jour même.",
  },
  {
    q: "Comment éviter la fraude au pointage ?",
    a: "Géolocalisation par site, photo facultative, détection des doublons et anti-spoofing GPS. Les tentatives suspectes sont signalées au manager.",
  },
  {
    q: "Que se passe-t-il sans réseau ?",
    a: "L'application mobile fonctionne hors-ligne. Les pointages sont enregistrés localement et synchronisés dès le retour de connexion.",
  },
  {
    q: "Combien ça coûte ?",
    a: "Tarif transparent par employé actif et par mois. 7 jours gratuits sans carte bancaire pour tester. Voir la page tarifs pour le détail.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Chiffrement en transit et au repos, hébergement européen, sauvegardes quotidiennes, accès par rôles et journal d'audit complet.",
  },
];

export default function HomePage() {
  useEffect(() => {
    trackFbEvent("ViewContent", {
      content_name: "Page d'accueil OControle V2.2",
      content_category: "landing_page",
    });
  }, []);

  return (
    <>
      {/* 1. HERO + MOCKUP DASHBOARD CSS */}
      <section className="relative isolate overflow-hidden border-b">
        <div className="pointer-events-none absolute -top-40 -right-20 h-[640px] w-[640px] rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[460px] w-[460px] rounded-full bg-blue-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="animate-fade-up">
            <Badge className="mb-5 bg-primary/10 text-primary hover:bg-primary/10">
              <Sparkles className="mr-1.5 h-3 w-3" />
              Nouveau · Pointage + planning + rapports
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.05]">
              Le pointage simple pour les entreprises{" "}
              <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
                terrain.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              OControle centralise présences, plannings et rapports dans un seul
              outil. Vos équipes pointent en quelques secondes, vos managers
              voient tout en temps réel, la paie part sur des données fiables.
            </p>
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="gap-2 shadow-xl shadow-primary/20 transition hover:-translate-y-0.5"
                asChild
              >
                <Link href="/signup">
                  Démarrer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2" asChild>
                <Link href="/contact">Demander une démo</Link>
              </Button>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              <CheckCircle2 className="mr-1.5 inline h-3.5 w-3.5 text-emerald-600" />
              7 jours d&apos;essai · Sans carte bancaire · Support francophone
            </p>

            <div className="mt-8 flex items-center gap-4 border-t pt-6">
              <div className="flex -space-x-2">
                {[TESTIMONIAL_HR, TESTIMONIAL_OPS, TESTIMONIAL_DG].map(
                  (src) => (
                    <div
                      key={src}
                      className="relative h-9 w-9 overflow-hidden rounded-full border-2 border-background"
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                  ),
                )}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  4,9/5 · 350+ entreprises l&apos;utilisent déjà
                </p>
              </div>
            </div>
          </div>

          {/* MOCK BROWSER + DASHBOARD */}
          <div className="relative animate-slide-in">
            <div className="relative rounded-2xl border bg-card shadow-2xl shadow-primary/10 ring-1 ring-black/5 transition hover:shadow-primary/20">
              <div className="flex items-center gap-1.5 border-b px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-3 truncate rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  app.ocontrole.com/dashboard
                </span>
              </div>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-muted/40 p-3">
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      Présents
                    </p>
                    <p className="text-xl font-bold">
                      112
                      <span className="text-xs text-muted-foreground">/124</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      Retards
                    </p>
                    <p className="text-xl font-bold text-amber-600">3</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      Absents
                    </p>
                    <p className="text-xl font-bold text-rose-500">9</p>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border bg-background p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-semibold">Sites</p>
                    <p className="text-[10px] text-muted-foreground">
                      Présence du jour
                    </p>
                  </div>
                  {[
                    { name: "Plateau", val: 92, color: "bg-primary" },
                    { name: "Cocody", val: 78, color: "bg-emerald-500" },
                    { name: "Marcory", val: 65, color: "bg-blue-500" },
                  ].map((row, i) => (
                    <div
                      key={row.name}
                      className="flex items-center gap-3 text-[11px]"
                    >
                      <span className="w-16 text-muted-foreground">
                        {row.name}
                      </span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "animate-grow-bar h-full rounded-full",
                            row.color,
                            delayClass(i),
                          )}
                          style={{ ["--w" as never]: `${row.val}%` } as React.CSSProperties}
                        />
                      </div>
                      <span className="w-8 text-right font-semibold">
                        {row.val}%
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-xl border bg-background px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                      <Fingerprint className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-[11px] font-semibold leading-none">
                        Aïcha K.
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        Vient de pointer · Plateau
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    08:42
                  </span>
                </div>
              </div>
            </div>

            {/* Carte flottante : photo + statut */}
            <div className="animate-float absolute -bottom-6 -left-6 hidden w-60 rounded-2xl border bg-background p-3 shadow-2xl ring-1 ring-black/5 sm:block">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full border">
                  <Image
                    src={HERO_PORTRAIT}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Pointage · 08:42
                  </p>
                  <p className="text-sm font-semibold">Présente</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
                <MapPin className="h-3 w-3" />
                Site Plateau · GPS confirmé
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. BANDE LOGOS SECTEURS */}
      <section className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Adopté dans 5 secteurs clés
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {sectors.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="group flex items-center justify-center gap-2.5 rounded-xl border border-transparent py-3 opacity-70 transition hover:border-border hover:bg-card hover:opacity-100"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm font-semibold tracking-wide">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. BANDEAU MÉTRIQUES */}
      <section className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(0.76_0.15_84/.18),transparent_50%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {heroStats.map((s, i) => (
            <div
              key={s.label}
              className={cn("animate-fade-up", delayClass(i))}
            >
              <p className="text-4xl font-bold tracking-tight sm:text-5xl">
                {s.value}
                <span className="text-primary">+</span>
              </p>
              <p className="mt-2 text-sm text-white/70">{s.label}</p>
              <div className="mt-3 h-px w-12 bg-primary" />
            </div>
          ))}
        </div>
      </section>

      {/* 4. CAPTURES PRODUIT EN ALTERNANCE */}
      <section className="mx-auto max-w-7xl space-y-24 px-4 py-20 sm:px-6 lg:space-y-32 lg:px-8 lg:py-28">
        {showcase.map((block, idx) => {
          const isReversed = idx % 2 === 1;
          return (
            <div
              key={block.tag}
              className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <div
                className={`animate-fade-up ${isReversed ? "order-1 lg:order-2" : ""}`}
              >
                <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {block.tag}
                </span>
                <h3 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  {block.title}
                </h3>
                <p className="mt-4 text-muted-foreground">{block.desc}</p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {block.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                  >
                    Tester cette fonctionnalité
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div
                className={`${isReversed ? "order-2 lg:order-1" : ""} animate-slide-in`}
              >
                {block.side === "mobile" && <MockMobile />}
                {block.side === "planning" && <MockPlanning />}
                {block.side === "reports" && <MockReports />}
              </div>
            </div>
          );
        })}
      </section>

      {/* 5. BENTO FEATURES + PHOTOS RÉELLES */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mb-12 max-w-2xl">
            <Badge variant="secondary" className="mb-3">
              Plateforme complète
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Une plateforme. Toute la gestion du temps.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Pointage, planning, congés, rapports : tout est connecté pour vos
              équipes terrain et votre back-office.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-6 md:auto-rows-[180px]">
            {/* Grand bloc photo + overlay */}
            <article className="group relative overflow-hidden rounded-2xl border bg-card md:col-span-4 md:row-span-2">
              <Image
                src={BENTO_RETAIL}
                alt="Gérante de boutique souriante à l'accueil"
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-7 text-white">
                <Badge className="mb-3 bg-white/15 text-white hover:bg-white/15">
                  Pointage temps réel
                </Badge>
                <h3 className="text-2xl font-bold">
                  Vos sites pilotés en direct
                </h3>
                <p className="mt-1 max-w-md text-sm text-white/80">
                  Un tableau de bord unique pour voir qui est là, qui manque,
                  qui est en retard.
                </p>
                <div className="mt-5 inline-flex items-center gap-3 rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </span>
                  <span className="text-xs font-medium">
                    112 présents · 3 retards · 9 absents
                  </span>
                </div>
              </div>
            </article>

            <article className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md md:col-span-2">
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Multi-sites</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Gérez plusieurs agences depuis un seul espace centralisé.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs">
                {["Plateau", "Cocody", "+3"].map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-muted px-2 py-0.5 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-2xl border md:col-span-2">
              <Image
                src={BENTO_TEAM}
                alt="Équipe diversifiée travaillant en open space"
                fill
                sizes="(max-width: 768px) 100vw, 30vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-wide text-white/70">
                  Planning
                </p>
                <p className="mt-1 text-base font-semibold">
                  Shifts & rotations sans Excel
                </p>
              </div>
            </article>

            <article className="group rounded-2xl border bg-card p-6 transition hover:-translate-y-1 hover:shadow-md md:col-span-2">
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Sécurité & rôles</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Permissions fines, journal d&apos;audit, données chiffrées.
              </p>
              <div className="mt-4 space-y-1.5">
                {["Manager", "RH", "Direction"].map((r) => (
                  <div
                    key={r}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-2.5 py-1.5 text-[11px]"
                  >
                    <span className="font-medium">{r}</span>
                    <span className="text-muted-foreground">accès défini</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="overflow-hidden rounded-2xl border bg-card p-6 md:col-span-2 md:row-span-2">
              <div className="mb-3 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">Rapports paie</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Heures, retards, absences, sup. — exports prêts pour la paie.
              </p>
              <div className="mt-5 flex h-32 items-end gap-1.5">
                {[40, 55, 72, 60, 85, 70, 92, 68, 78, 88, 95, 82].map(
                  (h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "animate-grow-height w-full rounded-t",
                        i % 3 === 2 ? "bg-primary/90" : "bg-primary/30",
                        delayClass(i % 5),
                      )}
                      style={
                        {
                          ["--h" as never]: `${h}%`,
                          height: `${h}%`,
                        } as React.CSSProperties
                      }
                    />
                  ),
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>12 derniers mois</span>
                <span className="font-semibold text-emerald-600">
                  +8,2% vs N-1
                </span>
              </div>
            </article>

            <article className="group relative overflow-hidden rounded-2xl border md:col-span-4">
              <Image
                src={BENTO_MOBILE}
                alt="Employée pointant depuis son smartphone"
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                className="object-cover object-center transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
              <div className="absolute inset-y-0 left-0 flex items-center p-7">
                <div className="text-white">
                  <Badge className="mb-3 bg-white/15 text-white hover:bg-white/15">
                    Mobile
                  </Badge>
                  <h3 className="text-2xl font-bold">
                    Une app pensée pour vos équipes terrain
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-white/80">
                    Pointage en 2 secondes, hors-ligne, géolocalisé. Adoption
                    immédiate.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* 6. TÉMOIGNAGES */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-12 grid items-end gap-4 lg:grid-cols-2">
          <div>
            <Badge variant="secondary" className="mb-3">
              Témoignages
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ils ont gagné en sérénité.
            </h2>
          </div>
          <p className="text-muted-foreground lg:text-right">
            350+ entreprises pilotent déjà leur présence avec OControle.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <article
              key={t.name}
              className={cn(
                "animate-fade-up group flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-1 hover:shadow-xl",
                delayClass(i),
              )}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={t.img}
                  alt={t.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star
                      key={k}
                      className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-auto border-t pt-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {t.city}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 7. FAQ */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <Badge variant="secondary" className="mb-3">
              FAQ
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Questions fréquentes
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Tout ce qu&apos;il faut savoir avant de démarrer l&apos;essai.
            </p>
          </div>

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
      </section>

      {/* 8. CTA FINAL DÉGRADÉ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-amber-400 to-orange-500" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(1_0_0/.3),transparent_50%)]" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-[420px] w-[420px] rounded-full bg-white/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-20 text-zinc-900 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:px-8 lg:py-28">
          <div className="animate-fade-up">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Modernisez votre pointage cette semaine.
            </h2>
            <p className="mt-4 max-w-xl text-base text-zinc-900/85">
              7 jours gratuits, sans carte. Configuration accompagnée par un
              expert francophone. Vos équipes pointent dès demain.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                className="gap-2 bg-zinc-900 text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-zinc-800"
                asChild
              >
                <Link href="/signup">
                  Démarrer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-zinc-900/30 bg-white/15 text-zinc-900 backdrop-blur hover:bg-white/30"
                asChild
              >
                <Link href="/pricing">Voir les tarifs</Link>
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-zinc-900/80">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sans carte bancaire
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Support FR 7j/7
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Annulable à tout moment
              </span>
            </div>
          </div>

          <div className="relative animate-slide-in">
            <div className="rotate-3 rounded-2xl border border-white/30 bg-white/15 p-5 shadow-2xl backdrop-blur-md">
              <p className="text-xs font-medium text-zinc-900/70">
                Aperçu temps réel
              </p>
              <p className="mt-1 text-3xl font-bold">94,2%</p>
              <p className="text-xs text-zinc-900/70">
                de présence aujourd&apos;hui
              </p>
              <div className="mt-4 h-2 w-full rounded-full bg-white/30">
                <div
                  className="animate-grow-bar h-full rounded-full bg-zinc-900"
                  style={{ ["--w" as never]: "94%" } as React.CSSProperties}
                />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-[10px]">
                <div className="rounded-md bg-white/40 p-1.5">
                  <p className="text-zinc-900/60">Présents</p>
                  <p className="font-bold">112</p>
                </div>
                <div className="rounded-md bg-white/40 p-1.5">
                  <p className="text-zinc-900/60">Retards</p>
                  <p className="font-bold">3</p>
                </div>
                <div className="rounded-md bg-white/40 p-1.5">
                  <p className="text-zinc-900/60">Absents</p>
                  <p className="font-bold">9</p>
                </div>
              </div>
            </div>

            <div className="animate-float absolute -bottom-6 right-4 -rotate-3 rounded-xl bg-white p-3 text-zinc-900 shadow-2xl">
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Économie estimée
              </p>
              <p className="text-lg font-bold">+ 60 h / an</p>
              <p className="text-[10px] text-zinc-500">par manager</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* MOCK COMPONENTS — captures produit reproduites en HTML/CSS façon Deputy    */
/* -------------------------------------------------------------------------- */

function MockMobile() {
  return (
    <div className="relative mx-auto w-[260px]">
      <div className="absolute -inset-4 rounded-[42px] bg-gradient-to-br from-primary/30 to-blue-500/20 blur-2xl" />
      <div className="relative rounded-[36px] border-[10px] border-zinc-900 bg-zinc-900 shadow-2xl">
        <div className="mx-auto h-5 w-24 rounded-b-2xl bg-zinc-900" />
        <div className="rounded-[26px] bg-background p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-muted-foreground">Bonjour</p>
              <p className="text-sm font-semibold">Aïcha K.</p>
            </div>
            <div className="relative h-9 w-9 overflow-hidden rounded-full">
              <Image
                src={HERO_PORTRAIT}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
              />
            </div>
          </div>

          <p className="mt-6 text-center font-mono text-3xl font-bold tabular-nums">
            08:42:17
          </p>
          <p className="text-center text-[11px] text-muted-foreground">
            Lundi 4 mars · Plateau
          </p>

          <button
            type="button"
            className="animate-pulse-ring mx-auto mt-6 grid h-28 w-28 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition active:scale-95"
          >
            <span className="text-xs font-bold uppercase tracking-wider">
              Pointer
            </span>
          </button>

          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            GPS confirmé · Site Plateau
          </div>

          <div className="mt-4 flex justify-around border-t pt-3">
            {[Clock3, CalendarCheck2, Bell].map((Icon, i) => (
              <Icon
                key={i}
                className={`h-4 w-4 ${i === 0 ? "text-primary" : "text-muted-foreground"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MockPlanning() {
  const employees = [
    { name: "Aïcha", days: ["8h", "8h", "RTT", "8h", "6h", "", ""] },
    { name: "Yann", days: ["", "8h", "8h", "8h", "8h", "4h", ""] },
    { name: "Mariam", days: ["8h", "", "8h", "Conf.", "8h", "", ""] },
    { name: "Karim", days: ["6h", "6h", "6h", "6h", "6h", "", ""] },
  ];
  const cellTone = (v: string) => {
    if (!v) return "";
    if (v === "RTT" || v === "Conf.")
      return "bg-emerald-500/15 text-emerald-700";
    return "bg-primary/15 text-primary";
  };

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/5">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div>
          <p className="text-sm font-semibold">Semaine 12 · Mars</p>
          <p className="text-[11px] text-muted-foreground">
            Site Plateau · 4 employés
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border px-2 py-0.5 text-xs"
          >
            ‹
          </button>
          <button
            type="button"
            className="rounded-md border px-2 py-0.5 text-xs"
          >
            ›
          </button>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Zap className="h-2.5 w-2.5" /> Auto-rotation
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[80px_repeat(7,1fr)] text-[11px]">
        <div className="border-b border-r p-2 font-medium text-muted-foreground">
          Employé
        </div>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div
            key={i}
            className={`border-b p-2 text-center font-medium ${i > 4 ? "text-muted-foreground" : ""}`}
          >
            {d}
          </div>
        ))}

        {employees.map((emp) => (
          <div key={emp.name} className="contents">
            <div className="border-b border-r p-2 font-medium">{emp.name}</div>
            {emp.days.map((d, i) => (
              <div key={i} className="border-b p-1">
                {d ? (
                  <div
                    className={`rounded-md p-1 text-center font-medium ${cellTone(d)}`}
                  >
                    {d}
                  </div>
                ) : (
                  <div className="h-6 rounded-md border border-dashed border-muted" />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2.5">
        <p className="text-[11px] text-muted-foreground">
          Total semaine · <span className="font-semibold">144 h</span>
        </p>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground shadow-sm"
        >
          Publier
        </button>
      </div>
    </div>
  );
}

function MockReports() {
  const bars = [60, 75, 92, 68, 82, 95, 70, 88, 78, 90, 84, 96];
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/5">
      <div className="flex items-start justify-between border-b p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Heures du mois
          </p>
          <p className="mt-1 text-3xl font-bold">
            1 248 h
            <span className="ml-2 align-middle text-sm font-medium text-emerald-600">
              +8,2%
            </span>
          </p>
        </div>
        <div className="flex gap-1">
          {["1S", "1M", "3M", "1A"].map((p, i) => (
            <button
              key={p}
              type="button"
              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${i === 1 ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-40 items-end gap-1.5 px-4 pt-4">
        {bars.map((h, i) => (
          <div
            key={i}
            className={cn(
              "animate-grow-height w-full rounded-t",
              i === 11
                ? "bg-primary"
                : i === 10
                  ? "bg-primary/80"
                  : "bg-primary/30",
              delayClass(i % 5),
            )}
            style={
              {
                ["--h" as never]: `${h}%`,
                height: `${h}%`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <div className="px-4 pb-3 pt-1.5 text-[10px] text-muted-foreground">
        12 derniers mois
      </div>

      <div className="grid grid-cols-3 border-t text-center text-[11px]">
        <div className="border-r py-2.5">
          <p className="text-muted-foreground">Régulier</p>
          <p className="font-semibold">982 h</p>
        </div>
        <div className="border-r py-2.5">
          <p className="text-muted-foreground">Sup.</p>
          <p className="font-semibold text-amber-600">186 h</p>
        </div>
        <div className="py-2.5">
          <p className="text-muted-foreground">Nuit</p>
          <p className="font-semibold">80 h</p>
        </div>
      </div>
    </div>
  );
}
