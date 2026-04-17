"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Stethoscope,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  MessageCircle,
  Mail,
  Copy,
  ExternalLink,
  Phone,
  RotateCw,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
  getChariowSalesAction,
  resyncChariowSaleAction,
  type ChariowSaleRow,
} from "../actions";

const SUPPORT_PHONE = "+2250778030075";
const SUPPORT_EMAIL = "ocontrolesupoport@gmail.com";
const APP_NAME = "OControle";

type StatusFilter = "all" | "completed" | "awaiting_payment" | "abandoned" | "failed" | "blocked";

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

function statusBadge(row: ChariowSaleRow) {
  if (row.status === "completed") {
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
        Réussi
      </Badge>
    );
  }
  if (row.status === "failed" || row.failedAt) {
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
        Échoué
      </Badge>
    );
  }
  if (row.status === "abandoned" || row.abandonedAt) {
    return (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
        Abandonné
      </Badge>
    );
  }
  if (row.status === "awaiting_payment") {
    return (
      <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        En attente
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-600">
      {row.status}
    </Badge>
  );
}

function isBlocked(row: ChariowSaleRow): boolean {
  if (row.status === "completed") return false;
  return (
    row.status === "abandoned" ||
    row.status === "failed" ||
    row.status === "awaiting_payment" ||
    !!row.abandonedAt ||
    !!row.failedAt
  );
}

function buildClientMessage(row: ChariowSaleRow): string {
  const firstName = row.customerFirstName?.trim() || "cher client";
  const planLabel = row.productName || row.planSlug || "votre abonnement";
  const cycle = row.billingCycle === "YEARLY" ? "annuel" : row.billingCycle === "MONTHLY" ? "mensuel" : "";
  const cycleSuffix = cycle ? ` (${cycle})` : "";

  const link = row.checkoutUrl ?? "";

  return `Bonjour ${firstName},

Nous avons remarqué que votre paiement pour l'abonnement ${planLabel}${cycleSuffix} sur ${APP_NAME} n'a pas pu être finalisé.

Pas d'inquiétude, vous pouvez reprendre votre paiement directement via ce lien sécurisé :
${link || "(lien indisponible — merci de revenir sur ocontrole.com/dashboard/billing)"}

Si vous rencontrez le moindre problème, notre équipe est là pour vous aider :
WhatsApp : ${SUPPORT_PHONE}
Email : ${SUPPORT_EMAIL}

À très vite,
L'équipe ${APP_NAME}`;
}

function copyToClipboard(text: string, label = "Copié") {
  if (typeof window === "undefined" || !navigator.clipboard) {
    toast.error("Presse-papier indisponible");
    return;
  }
  void navigator.clipboard
    .writeText(text)
    .then(() => toast.success(label))
    .catch(() => toast.error("Échec de la copie"));
}

function buildWhatsAppLink(phone: string | undefined, message: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function buildMailtoLink(email: string | undefined, message: string): string | null {
  if (!email) return null;
  const subject = `Reprenez votre abonnement ${APP_NAME}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
}

export default function BillingDebugPage() {
  const [data, setData] = useState<ChariowSaleRow[]>([]);
  const [kpis, setKpis] = useState<{
    total: number;
    completed: number;
    abandoned: number;
    failed: number;
    awaitingPayment: number;
    revenueTotal: number;
    blockedNeedingHelp: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [resyncingId, setResyncingId] = useState<string | null>(null);

  // Modal "Message client"
  const [messageModal, setMessageModal] = useState<{
    open: boolean;
    sale: ChariowSaleRow | null;
    message: string;
  }>({ open: false, sale: null, message: "" });

  // Modal "Détails sale"
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    sale: ChariowSaleRow | null;
  }>({ open: false, sale: null });

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await getChariowSalesAction(150);
      setData(res.sales);
      setKpis(res.kpis);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    let rows = data;
    if (statusFilter !== "all") {
      if (statusFilter === "blocked") {
        rows = rows.filter((r) => isBlocked(r));
      } else if (statusFilter === "abandoned") {
        rows = rows.filter((r) => r.status === "abandoned" || !!r.abandonedAt);
      } else if (statusFilter === "failed") {
        rows = rows.filter((r) => r.status === "failed" || !!r.failedAt);
      } else {
        rows = rows.filter((r) => r.status === statusFilter);
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        [
          r.customerEmail,
          r.customerFirstName,
          r.customerLastName,
          r.customerPhone,
          r.companyName,
          r.saleId,
          r.productName,
        ]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [data, statusFilter, search]);

  async function handleResync(saleId: string) {
    setResyncingId(saleId);
    try {
      const res = await resyncChariowSaleAction(saleId);
      if (res.success) {
        toast.success(`Re-synchronisée: ${res.data?.status ?? "ok"}`);
        await load(true);
      } else {
        toast.error(res.error ?? "Échec de la synchronisation");
      }
    } finally {
      setResyncingId(null);
    }
  }

  function openMessageModal(sale: ChariowSaleRow) {
    setMessageModal({
      open: true,
      sale,
      message: buildClientMessage(sale),
    });
  }

  function openDetailModal(sale: ChariowSaleRow) {
    setDetailModal({ open: true, sale });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-red-600" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Diagnostic paiements
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Visualisez les ventes Chariow, repérez les paiements bloqués et envoyez un lien de
            reprise au client en un clic.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total", value: kpis.total, icon: Stethoscope, color: "text-blue-500" },
            { label: "Réussies", value: kpis.completed, icon: CheckCircle, color: "text-green-500" },
            { label: "En attente", value: kpis.awaitingPayment, icon: Clock, color: "text-amber-500" },
            { label: "Abandonnées", value: kpis.abandoned, icon: AlertTriangle, color: "text-orange-500" },
            { label: "Échouées", value: kpis.failed, icon: XCircle, color: "text-red-500" },
            {
              label: "À relancer",
              value: kpis.blockedNeedingHelp,
              icon: MessageCircle,
              color: "text-purple-500",
            },
          ].map((k) => (
            <Card key={k.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <k.icon className={`h-5 w-5 ${k.color}`} />
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">{k.label}</p>
                  <p className="text-lg font-bold">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
          <Card className="col-span-2 border-0 shadow-sm md:col-span-3 lg:col-span-6">
            <CardContent className="flex items-center gap-3 p-4">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">
                  CA encaissé (sales chargées)
                </p>
                <p className="text-xl font-bold">
                  {kpis.revenueTotal.toLocaleString("fr-FR")} XOF
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtres */}
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Rechercher email, téléphone, entreprise, sale ID…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter((v as StatusFilter) ?? "all")}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="blocked">À relancer (bloqués)</SelectItem>
              <SelectItem value="completed">Réussies</SelectItem>
              <SelectItem value="awaiting_payment">En attente</SelectItem>
              <SelectItem value="abandoned">Abandonnées</SelectItem>
              <SelectItem value="failed">Échouées</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">
              Aucune vente correspondante.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs uppercase tracking-wider text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Client</th>
                    <th className="px-4 py-3">Entreprise</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Statut</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((row) => {
                    const blocked = isBlocked(row);
                    return (
                      <tr key={row.saleId} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-xs text-slate-500">
                          <div>{formatDateTime(row.createdAt)}</div>
                          {row.completedAt && (
                            <div className="text-[10px] text-green-600">
                              ✓ {formatDateTime(row.completedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {[row.customerFirstName, row.customerLastName]
                              .filter(Boolean)
                              .join(" ") || "—"}
                          </div>
                          <div className="text-xs text-slate-500">{row.customerEmail ?? "—"}</div>
                          {row.customerPhone && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Phone className="h-3 w-3" />
                              {row.customerPhone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {row.companyName ? (
                            <span className="font-medium">{row.companyName}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                          {row.companyId && (
                            <div className="font-mono text-[10px] text-slate-400">
                              {row.companyId.slice(0, 8)}…
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium">{row.productName}</div>
                          {row.billingCycle && (
                            <div className="text-[10px] text-slate-400">
                              {row.billingCycle === "YEARLY" ? "Annuel" : "Mensuel"}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold">
                          {row.amount > 0
                            ? `${row.amount.toLocaleString("fr-FR")} ${row.currency}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {statusBadge(row)}
                          {!row.hasLocalSuccess && row.status === "completed" && (
                            <div className="mt-1 text-[10px] text-amber-600">
                              ⚠ Pas synchronisé
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => openDetailModal(row)}
                              title="Voir les détails"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {blocked && (
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 gap-1 bg-purple-600 hover:bg-purple-700"
                                onClick={() => openMessageModal(row)}
                                title="Envoyer un message au client"
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                                Relancer
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => void handleResync(row.saleId)}
                              disabled={resyncingId === row.saleId}
                              title="Re-synchroniser depuis Chariow"
                            >
                              <RotateCw
                                className={`h-4 w-4 ${
                                  resyncingId === row.saleId ? "animate-spin" : ""
                                }`}
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Détails de la sale */}
      <Dialog
        open={detailModal.open}
        onOpenChange={(open) => setDetailModal((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails de la vente Chariow</DialogTitle>
            <DialogDescription>
              {detailModal.sale && (
                <span className="font-mono text-xs">{detailModal.sale.saleId}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          {detailModal.sale && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Statut Chariow" value={detailModal.sale.status} />
              <DetailRow
                label="Statut paiement"
                value={detailModal.sale.paymentStatus ?? "—"}
              />
              <DetailRow
                label="Montant"
                value={`${detailModal.sale.amount.toLocaleString("fr-FR")} ${detailModal.sale.currency}`}
              />
              <DetailRow label="Plan" value={detailModal.sale.productName} />
              <DetailRow label="Cycle" value={detailModal.sale.billingCycle ?? "—"} />
              <hr />
              <DetailRow
                label="Client"
                value={
                  [detailModal.sale.customerFirstName, detailModal.sale.customerLastName]
                    .filter(Boolean)
                    .join(" ") || "—"
                }
              />
              <DetailRow label="Email" value={detailModal.sale.customerEmail ?? "—"} />
              <DetailRow label="Téléphone" value={detailModal.sale.customerPhone ?? "—"} />
              <DetailRow label="Pays" value={detailModal.sale.customerCountry ?? "—"} />
              <hr />
              <DetailRow
                label="Entreprise"
                value={detailModal.sale.companyName ?? "(inconnue dans notre DB)"}
              />
              <DetailRow
                label="Company ID"
                value={detailModal.sale.companyId ?? "—"}
                mono
              />
              <hr />
              <DetailRow
                label="Webhook reçu (success)"
                value={detailModal.sale.hasLocalSuccess ? "✅ Oui" : "❌ Non"}
              />
              <DetailRow
                label="Webhook reçu (failed)"
                value={detailModal.sale.hasLocalFailure ? "⚠️ Oui" : "—"}
              />
              <DetailRow
                label="Webhook reçu (initiated)"
                value={detailModal.sale.hasLocalInitiated ? "✅ Oui" : "—"}
              />
              <hr />
              <DetailRow label="Créée le" value={formatDateTime(detailModal.sale.createdAt)} />
              <DetailRow
                label="Complétée le"
                value={formatDateTime(detailModal.sale.completedAt)}
              />
              <DetailRow
                label="Abandonnée le"
                value={formatDateTime(detailModal.sale.abandonedAt)}
              />
              <DetailRow label="Échouée le" value={formatDateTime(detailModal.sale.failedAt)} />
              {detailModal.sale.checkoutUrl && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:bg-slate-900">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">
                    Lien de checkout
                  </p>
                  <p className="break-all text-xs">{detailModal.sale.checkoutUrl}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            {detailModal.sale?.checkoutUrl && (
              <>
                <Button
                  variant="outline"
                  onClick={() =>
                    detailModal.sale?.checkoutUrl &&
                    copyToClipboard(detailModal.sale.checkoutUrl, "Lien copié")
                  }
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le lien
                </Button>
                <Button asChild>
                  <a
                    href={detailModal.sale.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ouvrir
                  </a>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Message client */}
      <Dialog
        open={messageModal.open}
        onOpenChange={(open) => setMessageModal((p) => ({ ...p, open }))}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageCircle className="size-5 text-purple-600" />
              Relancer le client
            </DialogTitle>
            <DialogDescription>
              Message pré-rédigé prêt à envoyer. Vous pouvez le modifier avant l&apos;envoi.
            </DialogDescription>
          </DialogHeader>

          {messageModal.sale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-[10px] uppercase text-slate-500">Client</p>
                  <p className="font-medium">
                    {[messageModal.sale.customerFirstName, messageModal.sale.customerLastName]
                      .filter(Boolean)
                      .join(" ") || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">Plan</p>
                  <p className="font-medium">{messageModal.sale.productName}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">Email</p>
                  <p className="font-mono">{messageModal.sale.customerEmail ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-slate-500">Téléphone</p>
                  <p className="font-mono">{messageModal.sale.customerPhone ?? "—"}</p>
                </div>
              </div>

              {!messageModal.sale.checkoutUrl && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Lien de checkout non disponible pour cette vente. Le message contiendra une
                    redirection vers la page de facturation.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message-content">Message</Label>
                <Textarea
                  id="message-content"
                  value={messageModal.message}
                  onChange={(e) =>
                    setMessageModal((p) => ({ ...p, message: e.target.value }))
                  }
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(messageModal.message, "Message copié")}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le message
                </Button>
                {messageModal.sale.checkoutUrl && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      copyToClipboard(messageModal.sale!.checkoutUrl!, "Lien copié")
                    }
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Copier le lien seul
                  </Button>
                )}
                {(() => {
                  const link = buildWhatsAppLink(
                    messageModal.sale.customerPhone,
                    messageModal.message,
                  );
                  return link ? (
                    <Button asChild className="bg-green-600 hover:bg-green-700">
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Envoyer sur WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" title="Numéro client manquant ou invalide">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp indispo.
                    </Button>
                  );
                })()}
                {(() => {
                  const link = buildMailtoLink(
                    messageModal.sale.customerEmail,
                    messageModal.message,
                  );
                  return link ? (
                    <Button asChild variant="outline">
                      <a href={link}>
                        <Mail className="mr-2 h-4 w-4" />
                        Ouvrir email
                      </a>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" title="Email client manquant">
                      <Mail className="mr-2 h-4 w-4" />
                      Email indispo.
                    </Button>
                  );
                })()}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setMessageModal((p) => ({ ...p, open: false }))}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs uppercase tracking-wide text-slate-500">{label}</span>
      <span className={`text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
