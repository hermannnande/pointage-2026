"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ExternalLink, Mail, MessageCircle, Phone, Rocket } from "lucide-react";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTutorialState } from "@/hooks/use-dashboard-preferences";
import { OnboardingTutorial } from "@/components/dashboard/onboarding-tutorial";

const WHATSAPP_NUMBER = "+2250778030075";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace(/\+/g, "")}?text=${encodeURIComponent("Bonjour, j'ai besoin d'aide avec OControle.")}`;

const FAQ_ITEMS = [
  {
    question: "Comment ajouter un employé ?",
    answer:
      "Allez dans Employés > Nouveau. Remplissez les informations puis cliquez sur Créer. Vous pouvez aussi importer plusieurs employés via un fichier CSV.",
  },
  {
    question: "Comment fonctionne le géofence ?",
    answer:
      "Le géofence vérifie que l'employé se trouve dans le rayon autorisé autour du site au moment du pointage. Le rayon est configurable par site.",
  },
  {
    question: "Comment configurer les horaires ?",
    answer:
      "Allez dans Plannings > Nouveau. Définissez les horaires pour chaque jour de la semaine, puis assignez le planning à vos employés.",
  },
  {
    question: "Comment un employé se connecte ?",
    answer:
      "L'employé se rend sur la page /employe et entre le code du site (donné par le responsable) ainsi que son mot de passe personnel. C'est tout !",
  },
  {
    question: "Comment approuver une demande de congé ?",
    answer:
      "Allez dans Congés > onglet En attente. Vous pouvez approuver ou rejeter chaque demande avec un motif optionnel.",
  },
  {
    question: "Comment exporter les rapports ?",
    answer:
      "Allez dans Rapports, sélectionnez le type de rapport et la période, puis cliquez sur Exporter CSV.",
  },
  {
    question: "Comment fonctionne l'essai gratuit ?",
    answer:
      "Vous bénéficiez de 14 jours d'essai gratuit avec accès complet. À l'expiration, choisissez un plan pour continuer à utiliser OControle.",
  },
  {
    question: "Comment modifier les informations de mon entreprise ?",
    answer:
      "Allez dans Paramètres, cliquez sur le bouton Modifier. Changez les informations souhaitées puis cliquez sur Enregistrer.",
  },
] as const;

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-medium transition hover:text-foreground/90"
        aria-expanded={open}
      >
        <span>{question}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <p className="pb-4 text-sm leading-relaxed text-muted-foreground">
          {answer}
        </p>
      ) : null}
    </div>
  );
}

export default function HelpPage() {
  const { reset: resetTutorial } = useTutorialState();
  const [showTutorial, setShowTutorial] = useState(false);

  function handleRelaunchTutorial() {
    resetTutorial();
    setShowTutorial(true);
  }

  return (
    <>
      {showTutorial && (
        <OnboardingTutorial onComplete={() => setShowTutorial(false)} />
      )}

      <PageHeader
        title="Centre d'aide"
        description="Trouvez des réponses à vos questions et contactez notre équipe."
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {/* Guide */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Rocket className="size-5 text-primary" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle>Guide de prise en main</CardTitle>
                <CardDescription>
                  Découvrez les fonctionnalités essentielles en quelques étapes simples.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              onClick={handleRelaunchTutorial}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Lancer le guide
            </Button>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Questions fréquentes</CardTitle>
            <CardDescription>
              Cliquez sur une question pour afficher la réponse.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {FAQ_ITEMS.map((item) => (
              <FaqItem
                key={item.question}
                question={item.question}
                answer={item.answer}
              />
            ))}
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Contactez-nous</CardTitle>
            <CardDescription>
              Notre équipe est disponible pour vous accompagner. Choisissez le moyen qui vous convient.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* WhatsApp */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-xl border-2 border-emerald-200 bg-emerald-50/50 p-4 transition-all hover:border-emerald-300 hover:shadow-md dark:border-emerald-900/50 dark:bg-emerald-950/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 shadow-md">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                    WhatsApp
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-600/80 dark:text-emerald-400/70">
                    Réponse rapide
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-emerald-800 dark:text-emerald-300">
                    {WHATSAPP_NUMBER}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 group-hover:underline dark:text-emerald-400">
                    Ouvrir WhatsApp
                    <ExternalLink className="h-3 w-3" />
                  </p>
                </div>
              </a>

              {/* Téléphone */}
              <a
                href={`tel:${WHATSAPP_NUMBER}`}
                className="group flex items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-4 transition-all hover:border-blue-300 hover:shadow-md dark:border-blue-900/50 dark:bg-blue-950/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 shadow-md">
                  <Phone className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Téléphone
                  </p>
                  <p className="mt-0.5 text-xs text-blue-600/80 dark:text-blue-400/70">
                    Appel direct
                  </p>
                  <p className="mt-1.5 text-sm font-medium text-blue-800 dark:text-blue-300">
                    {WHATSAPP_NUMBER}
                  </p>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:underline dark:text-blue-400">
                    Appeler maintenant
                    <ExternalLink className="h-3 w-3" />
                  </p>
                </div>
              </a>
            </div>

            {/* Email */}
            <a
              href="mailto:support@ocontrole.com"
              className="group flex items-start gap-3 rounded-xl border p-4 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold">E-mail</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  support@ocontrole.com
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                  Envoyer un email
                  <ExternalLink className="h-3 w-3" />
                </p>
              </div>
            </a>

            <div className="rounded-lg bg-muted/50 p-3 text-center text-xs text-muted-foreground">
              Disponible du lundi au samedi, de 8h à 18h (heure d&apos;Abidjan)
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
