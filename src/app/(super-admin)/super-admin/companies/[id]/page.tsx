"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Building2, Users, MapPin, CreditCard, Ban, PlayCircle,
  Clock, CalendarPlus, FileText, Send, Loader2, StickyNote,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  getCompanyDetailAction, suspendCompanyAction, reactivateCompanyAction,
  extendTrialAction, changePlanAction, addNoteAction, getPlansAction,
} from "../../actions";

const SUB_BADGE: Record<string, { label: string; cls: string }> = {
  TRIALING: { label: "Essai", cls: "bg-blue-100 text-blue-700" },
  ACTIVE: { label: "Actif", cls: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "Impayé", cls: "bg-amber-100 text-amber-700" },
  CANCELLED: { label: "Annulé", cls: "bg-slate-100 text-slate-700" },
  EXPIRED: { label: "Expiré", cls: "bg-red-100 text-red-700" },
};

type Detail = NonNullable<Awaited<ReturnType<typeof getCompanyDetailAction>>>;

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [company, setCompany] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [trialDays, setTrialDays] = useState("7");
  const [noteText, setNoteText] = useState("");
  const [plans, setPlans] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [selectedPlan, setSelectedPlan] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, planList] = await Promise.all([getCompanyDetailAction(id), getPlansAction()]);
      setCompany(detail);
      setPlans(planList.map((p) => ({ id: p.id, name: p.name, slug: p.slug })));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

  async function handleAction(actionName: string, fn: () => Promise<{ success: boolean; error?: string }>) {
    if (!confirm(`Confirmer l'action : ${actionName} ?`)) return;
    setActionLoading(actionName);
    try {
      const res = await fn();
      if (!res.success) { toast.error(res.error ?? "Erreur"); return; }
      toast.success(`${actionName} effectué avec succès`);
      void load();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddNote() {
    if (!noteText.trim()) return;
    setActionLoading("note");
    try {
      const res = await addNoteAction(id, noteText);
      if (!res.success) { toast.error(res.error ?? "Erreur"); return; }
      setNoteText("");
      toast.success("Note ajoutée");
      void load();
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">Entreprise introuvable</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/super-admin/companies")}>Retour</Button>
      </div>
    );
  }

  const sub = company.subscription;
  const subBadge = SUB_BADGE[sub?.status ?? ""] ?? { label: sub?.status ?? "—", cls: "bg-slate-100 text-slate-600" };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/super-admin/companies"><ArrowLeft className="mr-1 h-4 w-4" />Retour</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{company.name}</h1>
          <p className="text-sm text-slate-500">{company.email ?? "—"} · {company.country}</p>
        </div>
        <Badge variant="outline" className={`ml-auto ${subBadge.cls}`}>{subBadge.label}</Badge>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Employés", value: company._count.employees, icon: Users, color: "text-blue-600" },
          { label: "Lieux", value: company._count.sites, icon: MapPin, color: "text-green-600" },
          { label: "Pointages", value: company.totalClockings, icon: Clock, color: "text-purple-600" },
          { label: "Revenus", value: `${(company.totalRevenue ?? 0).toLocaleString("fr-FR")} XOF`, icon: CreditCard, color: "text-emerald-600" },
          { label: "Plan", value: sub?.plan?.name ?? "—", icon: FileText, color: "text-amber-600" },
        ].map((k) => (
          <Card key={k.label} className="border-0 shadow-sm">
            <CardContent className="flex items-center gap-3 p-4">
              <k.icon className={`h-5 w-5 ${k.color}`} />
              <div>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Actions */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-sm">Actions d&apos;administration</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {company.isActive ? (
            <Button variant="destructive" size="sm" disabled={actionLoading !== null}
              onClick={() => void handleAction("Suspendre le compte", () => suspendCompanyAction(id))}>
              {actionLoading === "Suspendre le compte" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Ban className="mr-1 h-4 w-4" />}
              Suspendre
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="text-green-700" disabled={actionLoading !== null}
              onClick={() => void handleAction("Réactiver le compte", () => reactivateCompanyAction(id))}>
              {actionLoading === "Réactiver le compte" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-1 h-4 w-4" />}
              Réactiver
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Input type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)} className="w-20" min={1} />
            <Button variant="outline" size="sm" disabled={actionLoading !== null}
              onClick={() => void handleAction("Prolonger l'essai", () => extendTrialAction(id, parseInt(trialDays)))}>
              <CalendarPlus className="mr-1 h-4 w-4" />
              Prolonger essai
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedPlan} onValueChange={(v) => setSelectedPlan(v ?? "")}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Changer plan" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => <SelectItem key={p.slug} value={p.slug}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" disabled={!selectedPlan || actionLoading !== null}
              onClick={() => void handleAction("Changer le plan", () => changePlanAction(id, selectedPlan))}>
              Appliquer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Infos</TabsTrigger>
          <TabsTrigger value="employees">Employés ({company.employees.length})</TabsTrigger>
          <TabsTrigger value="sites">Lieux ({company.sites.length})</TabsTrigger>
          <TabsTrigger value="billing">Facturation</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card className="border-0 shadow-sm">
            <CardContent className="grid gap-4 p-6 md:grid-cols-2">
              {[
                ["Nom", company.name], ["Slug", company.slug], ["Email", company.email ?? "—"],
                ["Téléphone", company.phone ?? "—"], ["Pays", company.country], ["Ville", company.city ?? "—"],
                ["Secteur", company.sector ?? "—"], ["Devise", company.currency],
                ["Créé le", new Date(company.createdAt).toLocaleDateString("fr-FR")],
                ["Fin essai", company.trialEndsAt ? new Date(company.trialEndsAt).toLocaleDateString("fr-FR") : "—"],
                ["Actif", company.isActive ? "Oui" : "Non"],
                ["Onboarding", `Étape ${company.onboardingStep}`],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employees">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">Poste</th>
                    <th className="px-4 py-3">Site</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {company.employees.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium">{e.firstName} {e.lastName}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.matricule}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.position ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-500">{e.site?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={e.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                          {e.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {company.employees.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun employé</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sites">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Nom</th>
                    <th className="px-4 py-3">Ville</th>
                    <th className="px-4 py-3 text-center">Employés</th>
                    <th className="px-4 py-3">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {company.sites.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-slate-500">{s.city ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center">{s._count.employees}</td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className={s.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                          {s.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Événements de facturation</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {company.billingEvents.length === 0 ? <p className="text-sm text-slate-400">Aucun événement</p> : null}
                {company.billingEvents.map((e) => (
                  <div key={e.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                    <div>
                      <p className="font-medium">{e.type}</p>
                      <p className="text-xs text-slate-500">{new Date(e.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className="font-semibold">{e.amount ? `${e.amount.toLocaleString("fr-FR")} ${e.currency ?? "XOF"}` : "—"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Factures</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {company.invoices.length === 0 ? <p className="text-sm text-slate-400">Aucune facture</p> : null}
                {company.invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/50">
                    <div>
                      <p className="font-medium">{inv.number}</p>
                      <p className="text-xs text-slate-500">{new Date(inv.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{inv.amount.toLocaleString("fr-FR")} {inv.currency}</p>
                      <Badge variant="outline" className={inv.status === "PAID" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}>{inv.status}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="admins">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-slate-50 text-xs text-slate-500 dark:bg-slate-800/50">
                  <tr>
                    <th className="px-4 py-3">Utilisateur</th>
                    <th className="px-4 py-3">Rôle</th>
                    <th className="px-4 py-3">Propriétaire</th>
                    <th className="px-4 py-3">Dernière connexion</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {company.memberships.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{m.user.fullName}</p>
                        <p className="text-xs text-slate-400">{m.user.email}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{m.role?.name ?? "—"}</td>
                      <td className="px-4 py-2.5">{m.isOwner ? "✓" : "—"}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{m.user.lastLoginAt ? new Date(m.user.lastLoginAt).toLocaleString("fr-FR") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><StickyNote className="h-4 w-4" />Notes internes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Ajouter une note interne…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAddNote(); }}
                />
                <Button size="sm" disabled={!noteText.trim() || actionLoading === "note"} onClick={() => void handleAddNote()}>
                  {actionLoading === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {company.adminNotes.length === 0 ? (
                <p className="text-sm text-slate-400">Aucune note</p>
              ) : (
                <div className="space-y-2">
                  {company.adminNotes.map((n) => (
                    <div key={n.id} className="rounded-lg border bg-yellow-50/50 p-3 dark:bg-yellow-900/10">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{n.content}</p>
                      <p className="mt-1 text-xs text-slate-400">{n.author.fullName} · {new Date(n.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
