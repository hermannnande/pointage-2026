"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Check, Users, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ENTERPRISE_PLAN, formatPrice } from "@/config/plans";
import type { SubStatus } from "@prisma/client";

import {
  cancelSubscriptionAction,
  createCheckoutAction,
  getBillingHistoryAction,
  getPlansAction,
  getQuotaStatusAction,
  getSubscriptionAction,
  getSubscriptionStatusAction,
} from "./actions";

type BillingCycleUi = "MONTHLY" | "YEARLY";

function statusBadgeConfig(status: SubStatus): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  switch (status) {
    case "TRIALING":
      return {
        label: "Essai gratuit",
        variant: "outline",
        className: "border-blue-600 text-blue-700 dark:text-blue-400",
      };
    case "ACTIVE":
      return {
        label: "Actif",
        variant: "outline",
        className: "border-green-600 text-green-700 dark:text-green-400",
      };
    case "PAST_DUE":
      return { label: "Impayé", variant: "destructive" };
    case "GRACE_PERIOD":
      return {
        label: "Période de grâce",
        variant: "outline",
        className: "border-amber-600 text-amber-800 dark:text-amber-400",
      };
    case "CANCELLED":
      return { label: "Annulé", variant: "secondary" };
    case "EXPIRED":
      return { label: "Expiré", variant: "destructive" };
    default:
      return { label: String(status), variant: "secondary" };
  }
}

function invoiceStatusBadge(status: string): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (status) {
    case "PAID":
      return {
        label: "Payé",
        variant: "outline",
      };
    case "PENDING":
      return {
        label: "En attente",
        variant: "outline",
      };
    case "FAILED":
      return { label: "Échoué", variant: "destructive" };
    case "REFUNDED":
      return { label: "Remboursé", variant: "secondary" };
    default:
      return { label: status, variant: "secondary" };
  }
}

function formatPeriodRange(start: Date, end: Date) {
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${start.toLocaleDateString("fr-FR", opts)} — ${end.toLocaleDateString("fr-FR", opts)}`;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycleUi>("MONTHLY");
  const [subscription, setSubscription] = useState<
    Awaited<ReturnType<typeof getSubscriptionAction>>
  >(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    Awaited<ReturnType<typeof getSubscriptionStatusAction>> | null
  >(null);
  const [quota, setQuota] = useState<
    Awaited<ReturnType<typeof getQuotaStatusAction>>
  >(null);
  const [plans, setPlans] = useState<Awaited<ReturnType<typeof getPlansAction>>>(
    [],
  );
  const [invoices, setInvoices] = useState<
    Awaited<ReturnType<typeof getBillingHistoryAction>>
  >([]);
  const [checkoutPlanId, setCheckoutPlanId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, status, q, p, inv] = await Promise.all([
        getSubscriptionAction(),
        getSubscriptionStatusAction(),
        getQuotaStatusAction(),
        getPlansAction(),
        getBillingHistoryAction(),
      ]);
      setSubscription(sub);
      setSubscriptionStatus(status);
      setQuota(q);
      setPlans(p);
      setInvoices(inv);
    } catch {
      toast.error("Impossible de charger la facturation");
      setSubscription(null);
      setSubscriptionStatus(null);
      setQuota(null);
      setPlans([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
        "Annuler votre abonnement ? Vous conserverez l’accès jusqu’à la fin de la période en cours selon les conditions applicables.",
      )
    ) {
      return;
    }
    setCancelling(true);
    try {
      const res = await cancelSubscriptionAction();
      if (res.success) {
        toast.success("Abonnement annulé");
        await load();
      } else {
        toast.error(res.error ?? "Échec de l’annulation");
      }
    } catch {
      toast.error("Échec de l’annulation");
    } finally {
      setCancelling(false);
    }
  }

  const statusCfg = subscriptionStatus
    ? statusBadgeConfig(subscriptionStatus.status)
    : null;

  const showStatusAlert =
    subscriptionStatus && subscriptionStatus.status !== "ACTIVE";

  const canCancel =
    subscription &&
    (subscription.status === "ACTIVE" || subscription.status === "TRIALING");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Facturation"
        description="Gérez votre abonnement et vos paiements"
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Abonnement actuel</CardTitle>
          <CardDescription>
            Statut, quotas et période de facturation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ) : !subscription ? (
            <p className="text-sm text-muted-foreground">
              Aucun abonnement trouvé.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-semibold">
                  {subscription.plan.name}
                </span>
                {statusCfg && (
                  <Badge
                    variant={statusCfg.variant}
                    className={statusCfg.className}
                  >
                    {statusCfg.label}
                  </Badge>
                )}
                <Badge variant="outline">
                  {subscription.billingCycle === "YEARLY"
                    ? "Annuel"
                    : "Mensuel"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Période :{" "}
                {formatPeriodRange(
                  subscription.currentPeriodStart,
                  subscription.currentPeriodEnd,
                )}
              </p>
              {showStatusAlert && subscriptionStatus?.message && (
                <p
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                  role="alert"
                >
                  {subscriptionStatus.message}
                </p>
              )}
              {quota && (
                <div className="space-y-4">
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <Users className="size-4" aria-hidden />
                      Employés ({quota.employees.used} / {quota.employees.max})
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, quota.employees.pct)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-sm font-medium">
                      <Building2 className="size-4" aria-hidden />
                      Sites ({quota.sites.used} / {quota.sites.max})
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{
                          width: `${Math.min(100, quota.sites.pct)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
        {canCancel && (
          <CardFooter className="border-t pt-4">
            <Button
              variant="destructive"
              disabled={cancelling}
              onClick={() => void handleCancelSubscription()}
            >
              {cancelling ? "Annulation…" : "Annuler l’abonnement"}
            </Button>
          </CardFooter>
        )}
      </Card>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Plans</h2>
          <p className="text-sm text-muted-foreground">
            Choisissez la formule adaptée à votre entreprise
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={cycle === "MONTHLY" ? "default" : "outline"}
            size="sm"
            onClick={() => setCycle("MONTHLY")}
          >
            Mensuel
          </Button>
          <Button
            type="button"
            variant={cycle === "YEARLY" ? "default" : "outline"}
            size="sm"
            onClick={() => setCycle("YEARLY")}
          >
            Annuel
          </Button>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const features = plan.features as {
                name: string;
                included: boolean;
              }[];
              const isCurrent = subscription?.planId === plan.id;
              const price =
                cycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
              return (
                <Card
                  key={plan.id}
                  className={
                    plan.isPopular ? "ring-2 ring-primary ring-offset-2" : ""
                  }
                >
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <div className="flex flex-wrap gap-1">
                        {plan.isPopular && (
                          <Badge variant="default">Le plus populaire</Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="secondary">Votre plan</Badge>
                        )}
                      </div>
                    </div>
                    {plan.description && (
                      <CardDescription>{plan.description}</CardDescription>
                    )}
                    <p className="pt-2 text-2xl font-bold">
                      {formatPrice(price, plan.currency)}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / {cycle === "YEARLY" ? "an" : "mois"}
                      </span>
                    </p>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <ul className="space-y-2 text-sm">
                      {features.map((f) => (
                        <li
                          key={f.name}
                          className="flex items-start gap-2"
                        >
                          {f.included ? (
                            <Check
                              className="mt-0.5 size-4 shrink-0 text-green-600"
                              aria-hidden
                            />
                          ) : (
                            <X
                              className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                          )}
                          <span
                            className={
                              f.included ? "" : "text-muted-foreground line-through"
                            }
                          >
                            {f.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-auto w-full"
                      disabled={isCurrent || checkoutPlanId === plan.id}
                      onClick={() => void handleChoosePlan(plan.id)}
                    >
                      {checkoutPlanId === plan.id
                        ? "Redirection…"
                        : "Choisir ce plan"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        <Card>
          <CardHeader>
            <CardTitle>{ENTERPRISE_PLAN.name}</CardTitle>
            <CardDescription>{ENTERPRISE_PLAN.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {ENTERPRISE_PLAN.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <Button variant="outline" disabled>
              Contactez-nous
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Historique de facturation</h2>
          <p className="text-sm text-muted-foreground">
            Vos dernières factures et paiements
          </p>
        </div>
        {loading ? (
          <Skeleton className="h-40 w-full rounded-xl" />
        ) : invoices.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            Aucune facture
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[520px] border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-4 py-3 font-medium">Numéro</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Période</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const st = invoiceStatusBadge(inv.status);
                  const paidGreen =
                    inv.status === "PAID"
                      ? "border-green-600 text-green-700 dark:text-green-400"
                      : inv.status === "PENDING"
                        ? "border-amber-600 text-amber-800 dark:text-amber-400"
                        : undefined;
                  return (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">
                        {inv.number}
                      </td>
                      <td className="px-4 py-3">
                        {formatPrice(inv.amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatPeriodRange(inv.periodStart, inv.periodEnd)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={st.variant}
                          className={paidGreen}
                        >
                          {st.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {(inv.paidAt ?? inv.createdAt).toLocaleDateString(
                          "fr-FR",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
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
