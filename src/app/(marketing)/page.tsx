"use client";

import { useEffect, useRef, useState } from "react";
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
  Globe2,
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
import { cn } from "@/lib/utils";

function useInView(threshold = 0.15) {
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
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const features = [
  {
    icon: Clock,
    title: "Pointage instantané",
    description: "Un seul bouton pour pointer. Entrée, sortie, pause — en une seconde depuis n'importe quel appareil.",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    icon: MapPin,
    title: "Géolocalisation & Géofence",
    description: "Vérification automatique que l'employé est sur le lieu de travail. Rayon configurable par site.",
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: Building2,
    title: "Multi-sites illimités",
    description: "Gérez boutiques, bureaux, ateliers et dépôts depuis un seul tableau de bord centralisé.",
    color: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  },
  {
    icon: BarChart3,
    title: "Rapports automatiques",
    description: "Présences, retards, absences, heures sup — tout est calculé et exportable en CSV instantanément.",
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    icon: Calendar,
    title: "Plannings & Shifts",
    description: "Horaires fixes, shifts matin/soir, modèles réutilisables. Assignez en un clic à vos équipes.",
    color: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  {
    icon: Shield,
    title: "Sécurité de niveau bancaire",
    description: "Données isolées par entreprise, audit complet, chiffrement bout en bout, conformité RGPD.",
    color: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  {
    icon: Smartphone,
    title: "Mobile-first, PWA",
    description: "Installable comme une app native. Optimisé pour connexions instables et appareils modestes.",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  {
    icon: Bell,
    title: "Alertes intelligentes",
    description: "Notifications retard, absence, oubli de pointage. Résumé quotidien par email pour les managers.",
    color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  },
  {
    icon: FileText,
    title: "Gestion des congés",
    description: "Demandes, approbations, soldes, historique. Workflow complet avec notifications automatiques.",
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
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
  { name: "Écoles & Centres de formation", icon: "🎓" },
  { name: "Entreprises multisites", icon: "🌍" },
];

const testimonials = [
  {
    name: "Awa Konaté",
    role: "Gérante, Boutique Beauté",
    location: "Abidjan, CI",
    quote: "Avant je ne savais jamais si mes vendeuses étaient à l'heure. Maintenant je vois tout en temps réel depuis mon téléphone. C'est devenu indispensable.",
    rating: 5,
  },
  {
    name: "Kouamé Diallo",
    role: "Directeur RH, PME 85 employés",
    location: "Douala, CM",
    quote: "J'ai remplacé nos fichiers Excel par PointSync. Les rapports mensuels pour la paie sont prêts en un clic. On a gagné 3 jours de travail par mois.",
    rating: 5,
  },
  {
    name: "Fatou Sarr",
    role: "Manager Restaurant",
    location: "Dakar, SN",
    quote: "La gestion des shifts matin et soir est devenue tellement simple. Mes employés adorent le système. Aucune formation n'a été nécessaire.",
    rating: 5,
  },
];

const faqItems = [
  {
    q: "Dois-je installer une application sur les téléphones ?",
    a: "Non. PointSync fonctionne directement dans le navigateur de n'importe quel smartphone. Vos employés n'ont rien à installer. Vous pouvez aussi l'ajouter à l'écran d'accueil comme une application.",
  },
  {
    q: "Est-ce que ça marche avec une connexion internet instable ?",
    a: "Oui. PointSync est conçu pour l'Afrique. L'interface est ultra-légère et fonctionne même avec une connexion 2G/3G. Le pointage ne prend qu'une seconde.",
  },
  {
    q: "Mes données sont-elles sécurisées ?",
    a: "Absolument. Les données de chaque entreprise sont strictement isolées. Nous utilisons le chiffrement de niveau bancaire, l'audit complet et les standards de sécurité les plus stricts.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Mobile money (Orange Money, Wave, MTN Money, Moov Money), cartes bancaires (Visa, Mastercard) et virements pour les entreprises.",
  },
  {
    q: "Puis-je changer de plan ou annuler à tout moment ?",
    a: "Oui, sans engagement. Passez au plan supérieur en un clic, ou annulez quand vous voulez. Les 14 premiers jours sont gratuits sur tous les plans.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/50 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-foreground"
      >
        <span className="text-sm font-medium sm:text-base">{q}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300",
          open ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          <div className="absolute -bottom-20 right-0 h-[400px] w-[500px] rounded-full bg-primary/5 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-24 sm:pt-28 lg:px-8 lg:pb-32 lg:pt-36">
          <div className="mx-auto max-w-4xl text-center">
            <AnimateIn>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Essai gratuit 14 jours — Sans carte bancaire
              </div>
            </AnimateIn>

            <AnimateIn delay={100}>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Savez-vous à quelle heure{" "}
                <span className="relative whitespace-nowrap">
                  <span className="relative bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    vos employés arrivent
                  </span>
                </span>{" "}
                ?
              </h1>
            </AnimateIn>

            <AnimateIn delay={200}>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                PointSync est la solution de pointage la plus simple d&apos;Afrique.
                Suivez la présence de vos équipes en temps réel, gérez les retards,
                les absences et les congés — depuis n&apos;importe quel téléphone.
              </p>
            </AnimateIn>

            <AnimateIn delay={300}>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
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
              <p className="mt-6 text-xs text-muted-foreground sm:text-sm">
                Rejoint par{" "}
                <span className="font-semibold text-foreground">500+ entreprises</span>{" "}
                en Côte d&apos;Ivoire, au Sénégal et au Cameroun
              </p>
            </AnimateIn>
          </div>

          {/* Dashboard Mockup */}
          <AnimateIn delay={500} className="mt-16 sm:mt-20">
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute -inset-4 rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-xl border bg-card shadow-2xl shadow-primary/10 sm:rounded-2xl">
                <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-400" />
                    <div className="h-3 w-3 rounded-full bg-amber-400" />
                    <div className="h-3 w-3 rounded-full bg-green-400" />
                  </div>
                  <div className="mx-auto flex items-center gap-2 rounded-lg bg-background/80 px-4 py-1 text-xs text-muted-foreground">
                    <Globe2 className="h-3 w-3" />
                    app.pointsync.com/dashboard
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <div className="grid gap-3 sm:grid-cols-4 sm:gap-4">
                    {[
                      { label: "Présents", value: "42", badge: "89%", color: "text-emerald-600 bg-emerald-500/10" },
                      { label: "En retard", value: "3", badge: "6%", color: "text-amber-600 bg-amber-500/10" },
                      { label: "Absents", value: "2", badge: "4%", color: "text-red-600 bg-red-500/10" },
                      { label: "En pause", value: "5", badge: "", color: "text-blue-600 bg-blue-500/10" },
                    ].map((kpi) => (
                      <div key={kpi.label} className="rounded-lg border bg-background p-3 sm:p-4">
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <div className="mt-1 flex items-end gap-2">
                          <span className={cn("text-2xl font-bold sm:text-3xl", kpi.color.split(" ")[0])}>{kpi.value}</span>
                          {kpi.badge && (
                            <span className={cn("mb-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", kpi.color)}>{kpi.badge}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-3 sm:gap-4">
                    {/* Chart placeholder */}
                    <div className="sm:col-span-2 rounded-lg border bg-background p-3 sm:p-4">
                      <p className="text-xs font-medium text-muted-foreground">Tendance hebdomadaire</p>
                      <div className="mt-3 flex items-end gap-1.5 sm:gap-2">
                        {[65, 80, 72, 90, 85, 75, 88].map((h, i) => (
                          <div key={i} className="flex flex-1 flex-col items-center gap-1">
                            <div
                              className="w-full rounded-t bg-primary/80 transition-all"
                              style={{ height: `${h * 0.8}px` }}
                            />
                            <span className="text-[9px] text-muted-foreground">
                              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"][i]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Activity feed */}
                    <div className="rounded-lg border bg-background p-3 sm:p-4">
                      <p className="text-xs font-medium text-muted-foreground">Activité récente</p>
                      <div className="mt-3 space-y-2.5">
                        {[
                          { name: "Amara K.", action: "Arrivée", time: "07:58", ok: true },
                          { name: "Fatou D.", action: "Retard", time: "08:22", ok: false },
                          { name: "Ibrahim S.", action: "Arrivée", time: "07:55", ok: true },
                          { name: "Marie L.", action: "Pause", time: "10:30", ok: true },
                        ].map((e, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <div className={cn("h-1.5 w-1.5 rounded-full", e.ok ? "bg-emerald-500" : "bg-amber-500")} />
                              <span className="font-medium">{e.name}</span>
                            </div>
                            <span className="text-muted-foreground">{e.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ===== SOCIAL PROOF BAR ===== */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
            {stats.map((stat) => (
              <AnimateIn key={stat.label} className="text-center">
                <stat.icon className="mx-auto mb-2 h-5 w-5 text-primary/60" />
                <div className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  {stat.value}
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">{stat.label}</div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES GRID ===== */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Fonctionnalités
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Tout ce dont vous avez besoin,{" "}
              <span className="text-primary">rien de superflu</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Un outil complet, simple et pensé pour les réalités africaines.
              Pas de fonctions inutiles, que de l&apos;essentiel.
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
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative overflow-hidden border-y bg-muted/20">
        <div className="pointer-events-none absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Comment ça marche
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Opérationnel en{" "}
              <span className="text-primary">3 minutes</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Pas besoin de technicien. Pas de formation requise. Pas de matériel à acheter.
            </p>
          </AnimateIn>

          <div className="mt-16 grid gap-8 md:grid-cols-3 md:gap-12">
            {[
              {
                step: "01",
                icon: Fingerprint,
                title: "Créez votre compte",
                description: "Inscrivez-vous en 30 secondes. Nommez votre entreprise, ajoutez votre premier site avec son adresse.",
              },
              {
                step: "02",
                icon: Users,
                title: "Ajoutez vos employés",
                description: "Entrez vos employés un par un ou importez-les depuis un fichier CSV. Assignez-les à leurs sites.",
              },
              {
                step: "03",
                icon: Zap,
                title: "Vos employés pointent",
                description: "Chaque employé ouvre son navigateur, appuie sur un bouton. Vous voyez tout en temps réel dans votre dashboard.",
              },
            ].map((item, i) => (
              <AnimateIn key={item.step} delay={i * 150}>
                <div className="relative text-center">
                  {i < 2 && (
                    <div className="absolute right-0 top-10 hidden h-px w-full translate-x-1/2 bg-gradient-to-r from-border to-transparent md:block" />
                  )}
                  <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                    <div className="absolute inset-0 rounded-2xl bg-primary/10" />
                    <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-lg">
                      {item.step.replace("0", "")}
                    </div>
                    <item.icon className="relative h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </AnimateIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DETAILED FEATURES (ALTERNATING) ===== */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
        <div className="space-y-24 sm:space-y-32">
          {/* Feature 1: Dashboard */}
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <AnimateIn>
              <Badge variant="secondary" className="mb-4">Tableau de bord</Badge>
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Visibilité totale,{" "}
                <span className="text-primary">en un coup d&apos;oeil</span>
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Qui est présent ? Qui est en retard ? Combien d&apos;heures travaillées cette semaine ?
                Tout est visible instantanément, sans chercher, sans cliquer 10 fois.
              </p>
              <ul className="mt-6 space-y-3">
                {["KPI en temps réel", "Graphiques de tendances", "Vue par site ou globale", "Dashboard personnalisé par rôle"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </AnimateIn>
            <AnimateIn delay={200}>
              <div className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: TrendingUp, label: "Taux de présence", value: "94%", color: "text-emerald-600" },
                    { icon: Clock, label: "Heures moyennes", value: "7h45", color: "text-blue-600" },
                    { icon: Users, label: "Employés actifs", value: "47", color: "text-violet-600" },
                    { icon: Layers, label: "Sites actifs", value: "3", color: "text-amber-600" },
                  ].map((kpi) => (
                    <div key={kpi.label} className="rounded-lg border bg-card p-3 sm:p-4">
                      <kpi.icon className={cn("h-5 w-5", kpi.color)} />
                      <p className={cn("mt-2 text-xl font-bold sm:text-2xl", kpi.color)}>{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>

          {/* Feature 2: Kiosk */}
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <AnimateIn delay={200} className="order-2 md:order-1">
              <div className="mx-auto max-w-xs rounded-xl border-2 border-foreground/10 bg-gradient-to-b from-foreground/5 to-transparent p-6 sm:p-8">
                <div className="text-center">
                  <p className="text-5xl font-bold tracking-tight sm:text-6xl">08:02</p>
                  <p className="mt-1 text-sm text-muted-foreground">Mardi 31 Mars 2026</p>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, null].map((n, i) => (
                    <div key={i} className={cn("flex h-12 items-center justify-center rounded-lg text-lg font-semibold transition-colors", n !== null ? "border bg-card hover:bg-accent" : "")}>
                      {n !== null ? n : ""}
                    </div>
                  ))}
                </div>
                <Button className="mt-4 w-full" size="lg">Pointer</Button>
              </div>
            </AnimateIn>
            <AnimateIn className="order-1 md:order-2">
              <Badge variant="secondary" className="mb-4">Mode Kiosque</Badge>
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Une tablette à l&apos;entrée,{" "}
                <span className="text-primary">et c&apos;est tout</span>
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Posez une tablette ou un vieux téléphone à l&apos;entrée de votre magasin.
                Chaque employé tape son code PIN et pointe en 2 secondes. Simple, rapide, sans erreur.
              </p>
              <ul className="mt-6 space-y-3">
                {["Code PIN par employé", "Plein écran sécurisé", "Fonctionne sans internet temporaire", "Parfait pour les boutiques"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </AnimateIn>
          </div>

          {/* Feature 3: Reports */}
          <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
            <AnimateIn>
              <Badge variant="secondary" className="mb-4">Rapports</Badge>
              <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                La paie prête{" "}
                <span className="text-primary">en un clic</span>
              </h3>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                Exportez en CSV les heures travaillées, les retards, les absences, les heures supplémentaires.
                Par employé, par site, par période. Prêt pour votre comptable.
              </p>
              <ul className="mt-6 space-y-3">
                {["Synthèse de présence mensuelle", "Rapport de retards détaillé", "Export CSV en un clic", "Filtres par site et période"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
            </AnimateIn>
            <AnimateIn delay={200}>
              <div className="overflow-hidden rounded-xl border bg-card">
                <div className="border-b bg-muted/50 px-4 py-2.5">
                  <p className="text-xs font-medium text-muted-foreground">rapport_presence_mars_2026.csv</p>
                </div>
                <div className="p-4 font-mono text-xs">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-4">Employé</th>
                        <th className="pb-2 pr-4">Jours</th>
                        <th className="pb-2 pr-4">Heures</th>
                        <th className="pb-2">Retards</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {[
                        { name: "Amara K.", days: 22, hours: "176h", late: 0 },
                        { name: "Fatou D.", days: 20, hours: "158h", late: 3 },
                        { name: "Ibrahim S.", days: 21, hours: "170h", late: 1 },
                        { name: "Marie L.", days: 22, hours: "175h", late: 0 },
                        { name: "Oumar B.", days: 19, hours: "148h", late: 2 },
                      ].map((row) => (
                        <tr key={row.name}>
                          <td className="py-2 pr-4 font-medium">{row.name}</td>
                          <td className="py-2 pr-4">{row.days}</td>
                          <td className="py-2 pr-4">{row.hours}</td>
                          <td className={cn("py-2", row.late > 0 ? "text-amber-600" : "text-emerald-600")}>{row.late}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </section>

      {/* ===== USE CASES ===== */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Pour tous les métiers
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              De la petite boutique à la{" "}
              <span className="text-primary">grande entreprise</span>
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              PointSync s&apos;adapte à toutes les tailles et tous les secteurs d&apos;activité.
            </p>
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

      {/* ===== TESTIMONIALS ===== */}
      <section id="testimonials" className="scroll-mt-20">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Témoignages
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ils ont transformé leur{" "}
              <span className="text-primary">gestion de présence</span>
            </h2>
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
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-6 flex items-center gap-3 border-t pt-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {t.name.split(" ").map(n => n[0]).join("")}
                      </div>
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

      {/* ===== COMPARISON ===== */}
      <section className="border-y bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              Pourquoi PointSync
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Avant vs. <span className="text-primary">Après</span>
            </h2>
          </AnimateIn>

          <AnimateIn delay={100} className="mt-12">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border-2 border-red-200 bg-red-50/50 p-6 dark:border-red-900/50 dark:bg-red-950/20">
                <p className="mb-4 text-sm font-semibold text-red-700 dark:text-red-400">Sans PointSync</p>
                <ul className="space-y-3">
                  {[
                    "Cahier de pointage perdu ou falsifié",
                    "Aucune idée de qui est en retard",
                    "Calcul des heures à la main",
                    "3 jours pour préparer la paie",
                    "Pas de visibilité sur les sites distants",
                    "Conflits sur les heures travaillées",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-red-800/80 dark:text-red-300/80">
                      <span className="mt-0.5 text-red-500">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <p className="mb-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400">Avec PointSync</p>
                <ul className="space-y-3">
                  {[
                    "Pointage digital infalsifiable",
                    "Alertes retard en temps réel",
                    "Heures calculées automatiquement",
                    "Rapport de paie en 1 clic",
                    "Tous les sites dans un seul dashboard",
                    "Historique complet et auditable",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-emerald-800/80 dark:text-emerald-300/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="scroll-mt-20">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="text-center">
            <Badge variant="secondary" className="mb-4 px-3 py-1 text-xs font-medium">
              FAQ
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Questions fréquentes
            </h2>
          </AnimateIn>

          <AnimateIn delay={100} className="mt-12 rounded-xl border bg-card p-1">
            <div className="divide-y-0 px-4 sm:px-6">
              {faqItems.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          </AnimateIn>
        </div>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden border-t">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[400px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <AnimateIn className="mx-auto max-w-2xl text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Monitor className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Prêt à simplifier votre{" "}
              <span className="text-primary">pointage</span> ?
            </h2>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg">
              Créez votre compte en 30 secondes. 14 jours gratuits. Sans carte bancaire. Sans engagement.
            </p>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
              <Button size="lg" className="w-full gap-2 px-8 text-base shadow-lg shadow-primary/25 sm:w-auto" asChild>
                <Link href="/signup">
                  Démarrer mon essai gratuit
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full px-8 text-base sm:w-auto" asChild>
                <Link href="/pricing">Voir les tarifs</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Paiement sécurisé par Orange Money, Wave, MTN Money et carte bancaire
            </p>
          </AnimateIn>
        </div>
      </section>
    </>
  );
}
