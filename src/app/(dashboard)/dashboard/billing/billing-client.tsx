"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Calendar,
  Check,
  Clock3,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ENTERPRISE_PLAN, formatPrice } from "@/config/plans";

import type { BillingPageData } from "./actions";
import { cancelSubscriptionAction, createCheckoutAction } from "./actions";

type BillingCycleUi = "MONTHLY" | "YEARLY";
type SubStatusUi =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "GRACE_PERIOD"
  | "CANCELLED"
  | "EXPIRED";

const STATUS_CONFIG: Record<
  SubStatusUi,
  { label: string; color: string; bg: string; icon: typeof Zap }
> = {
  TRIALING: {
    label: "Essai gratuit",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
    icon: Sparkles,
  },
  ACTIVE: {
    label: "Actif",
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
    icon: Check,
  },
  PAST_DUE: {
    label: "Impayé",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    icon: CreditCard,
  },
  GRACE_PERIOD: {
    label: "Période de grâce",
    color: "text-amber-700 dark:text-amber-400",
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
    icon: Shield,
  },
  CANCELLED: {
    label: "Annulé",
    color: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700",
    icon: X,
  },
  EXPIRED: {
    label: "Expiré",
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
    icon: X,
  },
};

const PLAN_ICONS: Record<string, typeof Zap> = {
  starter: Rocket,
  growth: Zap,
  business: Crown,
};

function formatDateFr(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function QuotaBar({
  label,
  icon: Icon,
  used,
  max,
  pct,
}: {
  label: string;
  icon: typeof Users;
  used: number;
  max: number;
  pct: number;
}) {
  const barColor =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-primary";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {label}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {used} / {max}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted/60">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function BillingClient({ data }: { data: BillingPageData }) {
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycleUi>("MONTHLY");
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const { subscription, subscriptionStatus, quota, plans, invoices, pendingCheckout } = data;

  async function handleChoosePlan(planId: string) {
    setCheckoutPlanId(planId);
    try {
      const res = await createCheckoutAction(planId, cycle);
      if (res.success && res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
        return;
      }
      toast.error(res.error ?? "Impossible de lancer le paiement");
    } catch {
      toast.error("Impossible de lancer le paiement");
    } finally {
      setCheckoutPlanId(null);
    }
  }

  async function handleCancelSubscription() {
    if (
      !window.confirm(
        "Annuler votre abonnement ? Vous conserverez l'accès jusqu'à la fin de la période en cours.",
      )
    )
      return;
    setCancelling(true);
    try {
      const res = await cancelSubscriptionAction();
      if (res.success) {
        toast.success("Abonnement annulé");
        router.refresh();
      } else {
        toast.error(res.error ?? "Échec de l'annulation");
      }
    } catch {
      toast.error("Échec de l'annulation");
    } finally {
      setCancelling(false);
    }
  }

  const status = (subscriptionStatus?.status as SubStatusUi) ?? null;
  const cfg = status ? STATUS_CONFIG[status] ?? null : null;
  const canCancel =
    subscription &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING");

  return (
    <div className="space-y-10">
      <PageHeader
        title="Facturation"
        description="Gérez votre abonnement, vos plans et votre historique de paiements"
      />

      {pendingCheckout && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <Clock3 className="mt-0.5 size-4 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Paiement en attente</p>
            <p>
              Une tentative de paiement est en cours pour{" "}
              <span className="font-medium">
                {pendingCheckout.planName ?? "votre nouveau plan"}
              </span>
              {pendingCheckout.billingCycle
                ? ` (${pendingCheckout.billingCycle === "YEARLY" ? "Annuel" : "Mensuel"})`
                : ""}{" "}
              depuis le {formatDateFr(pendingCheckout.createdAt)}.
            </p>
          </div>
        </div>
      )}

      {/* ── Abonnement actuel ─────────────────────── */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="flex items-center gap-3 border-b bg-muted/30 px-6 py-4">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold">Abonnement actuel</h2>
            <p className="text-xs text-muted-foreground">
              Votre plan, quotas et période de facturation
            </p>
          </div>
        </div>

        <CardContent className="space-y-6 p-6">
          {!subscription ? (
            <div className="rounded-xl border-2 border-dashed p-8 text-center">
              <Sparkles className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="font-medium">Aucun abonnement actif</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Choisissez un plan ci-dessous pour commencer
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10">
                    <Star className="size-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">
                        {subscription.planName}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {subscription.billingCycle === "YEARLY"
                          ? "Annuel"
                          : "Mensuel"}
                      </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="size-3.5" />
                      {formatDateFr(subscription.currentPeriodStart)} —{" "}
                      {formatDateFr(subscription.currentPeriodEnd)}
                    </div>
                  </div>
                </div>

                {cfg && (
                  <div
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium ${cfg.bg} ${cfg.color}`}
                  >
                    <cfg.icon className="size-4" />
                    {cfg.label}
                    {subscriptionStatus?.daysRemaining != null &&
                      status !== "ACTIVE" && (
                        <span className="opacity-70">
                          — {subscriptionStatus.daysRemaining}j restant(s)
                        </span>
                      )}
                  </div>
                )}
              </div>

              {subscriptionStatus?.message && status !== "ACTIVE" && (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${cfg?.bg ?? ""} ${cfg?.color ?? ""}`}
                  role="alert"
                >
                  {subscriptionStatus.message}
                </div>
              )}

              {quota && (
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border bg-card p-4">
                    <QuotaBar
                      label="Employés"
                      icon={Users}
                      used={quota.employees.used}
                      max={quota.employees.max}
                      pct={quota.employees.pct}
                    />
                  </div>
                  <div className="rounded-xl border bg-card p-4">
                    <QuotaBar
                      label="Lieux"
                      icon={Building2}
                      used={quota.sites.used}
                      max={quota.sites.max}
                      pct={quota.sites.pct}
                    />
                  </div>
                </div>
              )}

              {canCancel && (
                <div className="flex justify-end border-t pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    disabled={cancelling}
                    onClick={() => void handleCancelSubscription()}
                  >
                    {cancelling ? "Annulation…" : "Annuler l'abonnement"}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ── Plans ─────────────────────────────────── */}
      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Choisissez votre plan</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              Tous les plans incluent 14 jours d&apos;essai gratuit
              <a
                href="/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Voir les détails
                <ExternalLink className="size-3" />
              </a>
            </p>
          </div>
          <div className="inline-flex rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => setCycle("MONTHLY")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                cycle === "MONTHLY"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensuel
            </button>
            <button
              type="button"
              onClick={() => setCycle("YEARLY")}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                cycle === "YEARLY"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annuel
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-400">
                -20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = subscription?.planId === plan.id;
            const price =
              cycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
            const monthlyEquivalent =
              cycle === "YEARLY" ? Math.round(plan.priceYearly / 12) : null;
            const PlanIcon = PLAN_ICONS[plan.slug] ?? Zap;

            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col overflow-hidden transition-shadow hover:shadow-lg ${
                  plan.isPopular
                    ? "border-primary/50 ring-2 ring-primary/20"
                    : "border"
                }`}
              >
                {plan.isPopular && (
                  <div className="bg-primary px-4 py-1.5 text-center text-xs font-semibold text-primary-foreground">
                    Le plus populaire
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex size-8 items-center justify-center rounded-lg ${
                        plan.isPopular ? "bg-primary/10" : "bg-muted"
                      }`}
                    >
                      <PlanIcon
                        className={`size-4 ${
                          plan.isPopular
                            ? "text-primary"
                            : "text-muted-foreground"
                        }`}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {isCurrent && (
                        <span className="text-[11px] font-medium text-primary">
                          Plan actuel
                        </span>
                      )}
                    </div>
                  </div>
                  {plan.description && (
                    <CardDescription className="mt-1">
                      {plan.description}
                    </CardDescription>
                  )}
                  <div className="mt-4">
                    <span className="text-3xl font-extrabold tracking-tight">
                      {formatPrice(price, plan.currency)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      / {cycle === "YEARLY" ? "an" : "mois"}
                    </span>
                    {monthlyEquivalent && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        soit {formatPrice(monthlyEquivalent, plan.currency)} /
                        mois
                      </p>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 pt-2">
                  <ul className="flex-1 space-y-2.5">
                    {plan.features
                      .filter((f) => f.included)
                      .map((f) => (
                        <li
                          key={f.name}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check
                            className="mt-0.5 size-4 shrink-0 text-green-600"
                            aria-hidden
                          />
                          {f.name}
                        </li>
                      ))}
                  </ul>
                  <Button
                    className="w-full"
                    size="lg"
                    variant={plan.isPopular ? "default" : "outline"}
                    disabled={isCurrent || checkoutPlanId === plan.id}
                    onClick={() => void handleChoosePlan(plan.id)}
                  >
                    {checkoutPlanId === plan.id ? (
                      "Redirection…"
                    ) : isCurrent ? (
                      "Plan actuel"
                    ) : (
                      <>
                        Choisir {plan.name}
                        <ArrowRight className="ml-1 size-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="border-2 border-dashed bg-muted/20">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:text-left">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Crown className="size-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">{ENTERPRISE_PLAN.name}</h3>
              <p className="text-sm text-muted-foreground">
                {ENTERPRISE_PLAN.description} — Employés illimités, lieux
                illimités, SSO, account manager dédié et plus encore.
              </p>
            </div>
            <Button variant="outline" className="shrink-0" asChild>
              <a href="mailto:contact@ocontrole.com">Contactez-nous</a>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* ── Historique ────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold">Historique de facturation</h2>
            <p className="text-xs text-muted-foreground">
              Vos dernières factures et paiements
            </p>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed p-10 text-center">
            <FileText className="mx-auto mb-3 size-8 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">
              Aucune facture pour le moment
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Les factures apparaîtront ici après votre premier paiement
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border shadow-sm">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Numéro
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Montant
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Période
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Statut
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const isPaid = inv.status === "PAID";
                  const isPending = inv.status === "PENDING";
                  return (
                    <tr
                      key={inv.id}
                      className="border-b transition-colors last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs">
                        {inv.number}
                      </td>
                      <td className="px-5 py-3.5 font-semibold">
                        {formatPrice(inv.amount, inv.currency)}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatDateFr(inv.periodStart)} —{" "}
                        {formatDateFr(inv.periodEnd)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                            isPaid
                              ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400"
                              : isPending
                                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
                          }`}
                        >
                          {isPaid && <Check className="size-3" />}
                          {isPaid
                            ? "Payé"
                            : isPending
                              ? "En attente"
                              : inv.status === "REFUNDED"
                                ? "Remboursé"
                                : "Échoué"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatDateFr(inv.paidAt ?? inv.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
