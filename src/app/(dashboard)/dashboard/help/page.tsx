"use client";

import { useState } from "react";
import { ChevronDown, Mail } from "lucide-react";

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
      "Vous bénéficiez de 14 jours d'essai gratuit avec accès complet. À l'expiration, choisissez un plan pour continuer à utiliser PointSync.",
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
  return (
    <>
      <PageHeader
        title="Centre d'aide"
        description="Trouvez des réponses à vos questions"
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
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

        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Mail className="size-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 space-y-1">
                <CardTitle>Besoin d&apos;aide supplémentaire ?</CardTitle>
                <CardDescription>
                  Notre équipe est disponible pour vous accompagner.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">
              <span className="text-muted-foreground">E-mail : </span>
              <span className="font-medium">support@pointsync.com</span>
            </p>
            <Button type="button" disabled>
              Envoyer un message
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
