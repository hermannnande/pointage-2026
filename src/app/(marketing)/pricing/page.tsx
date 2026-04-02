"use client";

import { useState } from "react";
import Link from "next/link";

import { Check, Minus, Sparkles } from "lucide-react";

import { ENTERPRISE_PLAN, formatPrice, PLANS } from "@/config/plans";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          Des tarifs simples et transparents
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          14 jours d&apos;essai gratuit sur tous les plans. Sans carte bancaire.
        </p>
      </div>

      {/* Toggle */}
      <div className="mt-10 flex items-center justify-center gap-3">
        <span
          className={`text-sm font-medium ${!isYearly ? "text-foreground" : "text-muted-foreground"}`}
        >
          Mensuel
        </span>
        <Switch checked={isYearly} onCheckedChange={setIsYearly} />
        <span
          className={`text-sm font-medium ${isYearly ? "text-foreground" : "text-muted-foreground"}`}
        >
          Annuel
        </span>
        {isYearly && (
          <Badge variant="secondary" className="ml-1 bg-success/10 text-success">
            -20% de réduction
          </Badge>
        )}
      </div>

      {/* Plans */}
      <div className="mt-12 grid gap-6 md:grid-cols-3 lg:gap-8">
        {PLANS.map((plan) => {
          const price = isYearly ? plan.priceYearly : plan.priceMonthly;
          const period = isYearly ? "/an" : "/mois";

          return (
            <Card
              key={plan.slug}
              className={`relative flex flex-col border-2 transition-shadow ${
                plan.isPopular
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border"
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1 bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    <Sparkles className="h-3 w-3" />
                    Le plus populaire
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2 pt-8">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>

              <CardContent className="flex-1 pb-6">
                <div className="mt-2">
                  <span className="text-4xl font-extrabold tracking-tight">
                    {formatPrice(price)}
                  </span>
                  <span className="text-sm text-muted-foreground">{period}</span>
                </div>

                {isYearly && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    soit {formatPrice(Math.round(plan.priceYearly / 12))}/mois
                  </p>
                )}

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-start gap-2.5">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span
                        className={`text-sm ${
                          feature.included
                            ? "text-foreground"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter className="pt-0">
                <Button
                  className="w-full"
                  variant={plan.isPopular ? "default" : "outline"}
                  size="lg"
                  asChild
                >
                  <Link href="/signup">Commencer l&apos;essai gratuit</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Enterprise */}
      <div className="mt-12">
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xl font-bold">{ENTERPRISE_PLAN.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {ENTERPRISE_PLAN.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {ENTERPRISE_PLAN.features.map((feature) => (
                  <Badge key={feature} variant="secondary" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </div>
            <Button size="lg" className="shrink-0 whitespace-nowrap" asChild>
              <Link href="mailto:contact@ocontrole.com">Nous contacter</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ */}
      <div className="mt-20 mx-auto max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-8">Questions fréquentes</h2>
        <div className="space-y-6">
          {[
            {
              q: "Dois-je entrer une carte bancaire pour l'essai gratuit ?",
              a: "Non. L'essai de 14 jours est totalement gratuit et sans engagement. Aucune carte bancaire n'est requise.",
            },
            {
              q: "Puis-je changer de plan à tout moment ?",
              a: "Oui. Vous pouvez passer au plan supérieur à tout moment. Le changement est immédiat et la différence est proratisée.",
            },
            {
              q: "Mes données sont-elles sécurisées ?",
              a: "Absolument. Les données de chaque entreprise sont strictement isolées. Nous utilisons le chiffrement et les standards de sécurité les plus stricts.",
            },
            {
              q: "Faut-il installer une application ?",
              a: "Non. OControle fonctionne directement dans le navigateur. Vous pouvez l'installer comme une application depuis votre téléphone, mais ce n'est pas obligatoire.",
            },
            {
              q: "Quels moyens de paiement acceptez-vous ?",
              a: "Nous acceptons le paiement par mobile money (Orange Money, Wave, MTN Money), les cartes bancaires et les virements pour les entreprises.",
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <h3 className="text-sm font-semibold">{q}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                {a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
