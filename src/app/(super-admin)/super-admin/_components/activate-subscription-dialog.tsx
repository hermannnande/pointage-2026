"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import {
  activateSubscriptionAction,
  getPlansAction,
} from "../actions";

type Plan = {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
};

interface ActivateSubscriptionDialogProps {
  companyId: string;
  companyName: string;
  /** Plan déjà associé (slug) pour pré-sélectionner. */
  defaultPlanSlug?: string | null;
  /** Cycle déjà associé pour pré-sélectionner. */
  defaultBillingCycle?: "MONTHLY" | "YEARLY" | null;
  /** Devise affichée dans les libellés (ex "XOF"). */
  defaultCurrency?: string;
  /** Le déclencheur du dialog (bouton custom). Si absent, on rend un bouton par défaut. */
  trigger?: ReactNode;
  /** Callback appelé après une activation réussie (pour rafraîchir la liste). */
  onSuccess?: () => void;
}

export function ActivateSubscriptionDialog({
  companyId,
  companyName,
  defaultPlanSlug,
  defaultBillingCycle,
  defaultCurrency = "XOF",
  trigger,
  onSuccess,
}: ActivateSubscriptionDialogProps) {
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planSlug, setPlanSlug] = useState(defaultPlanSlug ?? "");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    defaultBillingCycle ?? "MONTHLY",
  );
  const [durationMonths, setDurationMonths] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [paymentRef, setPaymentRef] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    void getPlansAction().then((list) => {
      setPlans(
        list.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          priceMonthly: p.priceMonthly,
          priceYearly: p.priceYearly,
          currency: p.currency,
        })),
      );
    });
  }, [open]);

  // Pré-remplit automatiquement le montant suggéré quand le plan ou le cycle change.
  useEffect(() => {
    if (!planSlug) return;
    const plan = plans.find((p) => p.slug === planSlug);
    if (!plan) return;
    const suggested =
      billingCycle === "YEARLY" ? plan.priceYearly : plan.priceMonthly;
    if (!amount) setAmount(String(suggested));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planSlug, billingCycle, plans]);

  const defaultMonths = billingCycle === "YEARLY" ? 12 : 1;
  const effectiveMonths = durationMonths
    ? Math.max(1, parseInt(durationMonths, 10) || defaultMonths)
    : defaultMonths;

  async function handleSubmit() {
    if (!planSlug) {
      toast.error("Choisis un plan");
      return;
    }

    setSubmitting(true);
    try {
      const res = await activateSubscriptionAction({
        companyId,
        planSlug,
        billingCycle,
        durationMonths: effectiveMonths,
        amount: amount ? parseInt(amount, 10) : undefined,
        currency: defaultCurrency,
        paymentRef: paymentRef.trim() || undefined,
        note: note.trim() || undefined,
      });
      if (!res.success) {
        toast.error(res.error ?? "Erreur lors de l'activation");
        return;
      }
      toast.success(
        `Abonnement activé : ${res.data?.planName} jusqu'au ${
          res.data?.periodEnd
            ? new Date(res.data.periodEnd).toLocaleDateString("fr-FR")
            : "—"
        }`,
      );
      setOpen(false);
      // Reset du form pour la prochaine ouverture
      setPaymentRef("");
      setNote("");
      setDurationMonths("");
      onSuccess?.();
    } finally {
      setSubmitting(false);
    }
  }

  const previewEnd = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + effectiveMonths);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  })();

  return (
    <>
      {/* Déclencheur exposé en dehors du <Dialog> car @base-ui/react n'a pas
          d'API DialogTrigger asChild — on contrôle l'ouverture via le state. */}
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button size="sm" variant="outline" className="text-emerald-700">
            <Wallet className="mr-1 h-4 w-4" />
            Activer / Reconduire
          </Button>
        )}
      </span>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-600" />
            Activer ou reconduire l&apos;abonnement
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{companyName}</span> — utilisé pour
            les paiements <strong>hors-Chariow</strong> (virement, espèces,
            Mobile Money direct…). L&apos;action est tracée dans les logs avec
            la référence saisie.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Plan */}
          <div className="grid gap-1.5">
            <Label htmlFor="act-plan">Plan</Label>
            <Select value={planSlug} onValueChange={(v) => setPlanSlug(v ?? "")}>
              <SelectTrigger id="act-plan">
                <SelectValue placeholder="Choisir un plan" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((p) => (
                  <SelectItem key={p.slug} value={p.slug}>
                    {p.name} —{" "}
                    {(billingCycle === "YEARLY"
                      ? p.priceYearly
                      : p.priceMonthly
                    ).toLocaleString("fr-FR")}{" "}
                    {p.currency}/{billingCycle === "YEARLY" ? "an" : "mois"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cycle + durée */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="act-cycle">Cycle</Label>
              <Select
                value={billingCycle}
                onValueChange={(v) => {
                  if (v === "MONTHLY" || v === "YEARLY") setBillingCycle(v);
                }}
              >
                <SelectTrigger id="act-cycle">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MONTHLY">Mensuel</SelectItem>
                  <SelectItem value="YEARLY">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="act-duration">Durée (mois)</Label>
              <Input
                id="act-duration"
                type="number"
                min={1}
                max={36}
                placeholder={String(defaultMonths)}
                value={durationMonths}
                onChange={(e) => setDurationMonths(e.target.value)}
              />
            </div>
          </div>

          {/* Montant + référence */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="act-amount">
                Montant ({defaultCurrency})
              </Label>
              <Input
                id="act-amount"
                type="number"
                min={0}
                placeholder="Ex: 4500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="act-ref">Référence paiement</Label>
              <Input
                id="act-ref"
                placeholder="Wave-12345 / Virement Eco…"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="act-note">Note interne (facultatif)</Label>
            <Textarea
              id="act-note"
              rows={2}
              placeholder="Contexte de l'activation manuelle…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Récap */}
          <div className="rounded-lg border bg-emerald-50/60 p-3 text-sm dark:bg-emerald-900/10">
            <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Période active jusqu&apos;au{" "}
              <span className="font-semibold">{previewEnd}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Statut → ACTIVE · trial &amp; grace remis à zéro · facture
              générée si montant &gt; 0
            </p>
          </div>
        </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={submitting}
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={() => void handleSubmit()}
              disabled={submitting || !planSlug}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  Activation…
                </>
              ) : (
                <>
                  <Wallet className="mr-1 h-4 w-4" />
                  Activer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
