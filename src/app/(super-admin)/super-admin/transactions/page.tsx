"use client";

import { useCallback, useEffect, useState } from "react";
import { Receipt, Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle, XCircle, MessageCircle, Copy, ExternalLink, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { getTransactionsAction, getTransactionKPIsAction, getTransactionRelanceAction, type TransactionRelanceData } from "../actions";

function buildWaLink(digits: string | undefined, message: string): string | null {
  if (!digits) return null;
  const d = digits.replace(/\D/g, "");
  if (d.length < 8) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(message)}`;
}

function copyText(text: string, label = "Copié") {
  if (typeof window === "undefined" || !navigator.clipboard) {
    toast.error("Presse-papier indisponible");
    return;
  }
  void navigator.clipboard
    .writeText(text)
    .then(() => toast.success(label))
    .catch(() => toast.error("Échec de la copie"));
}

type Tx = Awaited<ReturnType<typeof getTransactionsAction>>["data"][number];
type KPIs = Awaited<ReturnType<typeof getTransactionKPIsAction>>;

export default function TransactionsPage() {
  const [data, setData] = useState<Tx[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [kpis, setKpis] = useState<KPIs | null>(null);

  const [relance, setRelance] = useState<{
    open: boolean;
    loading: boolean;
    companyName: string;
    data: TransactionRelanceData | null;
    message: string;
  }>({ open: false, loading: false, companyName: "", data: null, message: "" });

  const openRelance = useCallback(async (tx: Tx) => {
    setRelance({ open: true, loading: true, companyName: tx.company.name, data: null, message: "" });
    try {
      const res = await getTransactionRelanceAction({
        companyId: tx.company.id,
        chariowSaleId: tx.chariowSaleId,
      });
      if (!res.success || !res.data) {
        toast.error(res.error ?? "Impossible de préparer la relance");
        setRelance((p) => ({ ...p, open: false, loading: false }));
        return;
      }
      setRelance((p) => ({ ...p, loading: false, data: res.data!, message: res.data!.message }));
    } catch {
      toast.error("Erreur lors de la préparation de la relance");
      setRelance((p) => ({ ...p, open: false, loading: false }));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize: 20 };
      if (search) filters.search = search;
      if (typeFilter !== "all") filters.type = typeFilter;
      const [res, k] = await Promise.all([
        getTransactionsAction(filters as Parameters<typeof getTransactionsAction>[0]),
        getTransactionKPIsAction(),
      ]);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
      setKpis(k);
    } finally {
      setLoading(false);
    }
  }, [page, search, typeFilter]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <p className="text-sm text-slate-500">{total} transaction{total > 1 ? "s" : ""}</p>
      </div>

      {kpis && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total tx", value: kpis.totalTx, icon: Receipt, color: "text-blue-500" },
            { label: "Réussies", value: kpis.successTotal, icon: CheckCircle, color: "text-green-500" },
            { label: "Échouées", value: kpis.failedTotal, icon: XCircle, color: "text-red-500" },
            { label: "CA jour", value: `${kpis.revenueToday.toLocaleString("fr-FR")}`, icon: DollarSign, color: "text-amber-500" },
            { label: "CA mois", value: `${kpis.revenueMonth.toLocaleString("fr-FR")}`, icon: DollarSign, color: "text-emerald-500" },
            { label: "CA total", value: `${kpis.revenueAll.toLocaleString("fr-FR")}`, icon: DollarSign, color: "text-purple-500" },
          ].map((k) => (
            <Card key={k.label} className="border-0 shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <k.icon className={`h-5 w-5 ${k.color}`} />
                <div>
                  <p className="text-[10px] text-slate-500">{k.label}</p>
                  <p className="text-lg font-bold">{k.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input placeholder="Rechercher par entreprise…" className="pl-9" value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="payment_success">Réussi</SelectItem>
              <SelectItem value="payment_failed">Échoué</SelectItem>
              <SelectItem value="payment_initiated">Initié</SelectItem>
              <SelectItem value="subscription_created">Abonnement créé</SelectItem>
              <SelectItem value="subscription_cancelled">Annulé</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
          ) : data.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucune transaction</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Entreprise</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Montant</th>
                    <th className="px-4 py-3">Référence</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{tx.id.slice(0, 8)}…</td>
                      <td className="px-4 py-2.5 font-medium">{tx.company.name}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={
                          tx.type === "payment_success" ? "bg-green-50 text-green-700"
                            : tx.type === "payment_failed" ? "bg-red-50 text-red-700"
                              : "bg-slate-50 text-slate-600"
                        }>{tx.type}</Badge>
                      </td>
                      <td className="px-4 py-2.5 font-semibold">{tx.amount ? `${tx.amount.toLocaleString("fr-FR")} ${tx.currency ?? "XOF"}` : "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{tx.chariowSaleId ?? "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(tx.createdAt).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-2.5 text-right">
                        {(tx.type === "payment_failed" || tx.type === "payment_initiated") && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 gap-1 bg-purple-600 hover:bg-purple-700"
                            onClick={() => void openRelance(tx)}
                            title="Relancer le propriétaire sur WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            Relancer
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-slate-500">Page {page}/{totalPages} ({total})</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal : relance WhatsApp du propriétaire */}
      <Dialog open={relance.open} onOpenChange={(o) => setRelance((p) => ({ ...p, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Relancer le paiement — {relance.companyName}</DialogTitle>
            <DialogDescription>
              Le message est adressé au propriétaire de l&apos;entreprise, avec le lien de paiement.
            </DialogDescription>
          </DialogHeader>

          {relance.loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Préparation de la relance…
            </div>
          ) : relance.data ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
                <p className="text-[10px] uppercase text-emerald-600">Destinataire (propriétaire)</p>
                <p className="font-mono">
                  {relance.data.ownerName ? `${relance.data.ownerName} · ` : ""}
                  {relance.data.ownerPhone ?? "numéro manquant"}
                </p>
              </div>

              {!relance.data.checkoutUrl && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Lien de paiement indisponible pour cette vente. Le message renvoie vers la page de facturation.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="relance-message">Message</Label>
                <Textarea
                  id="relance-message"
                  value={relance.message}
                  onChange={(e) => setRelance((p) => ({ ...p, message: e.target.value }))}
                  rows={12}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => copyText(relance.message, "Message copié")}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copier le message
                </Button>
                {relance.data.checkoutUrl && (
                  <Button variant="outline" onClick={() => copyText(relance.data!.checkoutUrl!, "Lien copié")}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Copier le lien seul
                  </Button>
                )}
                {(() => {
                  const link = buildWaLink(relance.data.ownerWhatsapp, relance.message);
                  return link ? (
                    <Button asChild className="bg-green-600 hover:bg-green-700">
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Envoyer sur WhatsApp
                      </a>
                    </Button>
                  ) : (
                    <Button disabled variant="outline" title="Numéro du propriétaire manquant dans la fiche entreprise">
                      <MessageCircle className="mr-2 h-4 w-4" />
                      WhatsApp indispo.
                    </Button>
                  );
                })()}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setRelance((p) => ({ ...p, open: false }))}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
