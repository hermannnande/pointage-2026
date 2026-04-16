"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Loader2,
  Megaphone,
  Send,
  Trash2,
  Users,
  Building2,
  User,
  AlertTriangle,
  Clock,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState } from "@/components/common/empty-state";

import {
  sendNotificationAction,
  getSentNotificationsAction,
  deleteNotificationAction,
  getEmployeesForSelectAction,
  getSitesForSelectAction,
} from "./actions";

type Target = "ALL" | "SITE" | "INDIVIDUAL";
type Priority = "LOW" | "NORMAL" | "URGENT";

interface EmployeeOption { id: string; name: string; site: string | null }
interface SiteOption { id: string; name: string }
interface SentNotification {
  id: string;
  title: string;
  message: string;
  priority: Priority;
  target: Target;
  employeeName: string | null;
  siteName: string | null;
  readCount: number;
  createdAt: Date;
  expiresAt: Date;
  isExpired: boolean;
}

const PRIORITY_LABELS: Record<Priority, { label: string; color: string; icon: typeof Bell }> = {
  LOW: { label: "Basse", color: "bg-slate-100 text-slate-700", icon: Bell },
  NORMAL: { label: "Normale", color: "bg-blue-100 text-blue-700", icon: Bell },
  URGENT: { label: "Urgente", color: "bg-red-100 text-red-700", icon: AlertTriangle },
};

const TARGET_LABELS: Record<Target, { label: string; icon: typeof Users }> = {
  ALL: { label: "Tous les employés", icon: Users },
  SITE: { label: "Par site", icon: Building2 },
  INDIVIDUAL: { label: "Individuel", icon: User },
};

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Target>("ALL");
  const [priority, setPriority] = useState<Priority>("NORMAL");
  const [employeeId, setEmployeeId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [sending, setSending] = useState(false);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [sent, setSent] = useState<SentNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, sts, notifs] = await Promise.all([
        getEmployeesForSelectAction(),
        getSitesForSelectAction(),
        getSentNotificationsAction(),
      ]);
      setEmployees(emps);
      setSites(sts);
      setSent(notifs as SentNotification[]);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleSend() {
    if (!title.trim() || !message.trim()) {
      toast.error("Veuillez remplir le titre et le message.");
      return;
    }
    if (target === "INDIVIDUAL" && !employeeId) {
      toast.error("Veuillez sélectionner un employé.");
      return;
    }
    if (target === "SITE" && !siteId) {
      toast.error("Veuillez sélectionner un site.");
      return;
    }

    setSending(true);
    try {
      const res = await sendNotificationAction({
        title: title.trim(),
        message: message.trim(),
        target,
        priority,
        employeeId: target === "INDIVIDUAL" ? employeeId : undefined,
        siteId: target === "SITE" ? siteId : undefined,
      });

      if (!res.success) {
        toast.error(res.error ?? "Erreur");
        return;
      }

      toast.success("Notification envoyée avec succès !");
      setTitle("");
      setMessage("");
      setTarget("ALL");
      setPriority("NORMAL");
      setEmployeeId("");
      setSiteId("");
      await loadData();
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await deleteNotificationAction(id);
      if (res.success) {
        toast.success("Notification supprimée");
        setSent((prev) => prev.filter((n) => n.id !== id));
      } else {
        toast.error(res.error ?? "Erreur");
      }
    } catch {
      toast.error("Erreur");
    }
  }

  function fmtDate(d: Date | string) {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Envoyez des messages à vos employés — individuellement ou en groupe."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Formulaire d'envoi */}
        <Card className="lg:col-span-2 rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Megaphone className="h-4 w-4 text-primary" />
              Nouvelle notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Destinataire</Label>
              <Select value={target} onValueChange={(v) => setTarget((v as Target) || "ALL")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">
                    <Users className="mr-1.5 inline h-3.5 w-3.5" />
                    Tous les employés
                  </SelectItem>
                  <SelectItem value="SITE">
                    <Building2 className="mr-1.5 inline h-3.5 w-3.5" />
                    Par site
                  </SelectItem>
                  <SelectItem value="INDIVIDUAL">
                    <User className="mr-1.5 inline h-3.5 w-3.5" />
                    Individuel
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {target === "SITE" && (
              <div className="space-y-2">
                <Label>Site</Label>
                <Select value={siteId} onValueChange={(v) => setSiteId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un site" />
                  </SelectTrigger>
                  <SelectContent>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {target === "INDIVIDUAL" && (
              <div className="space-y-2">
                <Label>Employé</Label>
                <Select value={employeeId} onValueChange={(v) => setEmployeeId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choisir un employé" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                        {e.site && <span className="ml-1 text-xs text-muted-foreground">· {e.site}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority((v as Priority) || "NORMAL")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Basse</SelectItem>
                  <SelectItem value="NORMAL">Normale</SelectItem>
                  <SelectItem value="URGENT">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                placeholder="Ex: Réunion importante demain"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Écrivez votre message ici..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length}/500
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <Clock className="mr-1 inline h-3 w-3" />
              La notification sera visible pendant <strong>24 heures</strong> sur le tableau de bord de l&apos;employé.
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleSend}
              disabled={sending || !title.trim() || !message.trim()}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Envoyer la notification
            </Button>
          </CardContent>
        </Card>

        {/* Historique */}
        <Card className="lg:col-span-3 rounded-2xl border-0 shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-muted-foreground" />
              Notifications envoyées
              {sent.length > 0 && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {sent.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : sent.length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="Aucune notification envoyée"
                description="Envoyez votre première notification à vos employés."
              />
            ) : (
              <div className="space-y-3">
                {sent.map((n) => {
                  const prioInfo = PRIORITY_LABELS[n.priority];
                  const targetInfo = TARGET_LABELS[n.target];
                  const TargetIcon = targetInfo.icon;

                  return (
                    <div
                      key={n.id}
                      className={`rounded-xl border p-4 transition-colors ${n.isExpired ? "bg-muted/30 opacity-60" : "bg-white"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-sm">{n.title}</h4>
                            <Badge variant="outline" className={`text-[10px] ${prioInfo.color}`}>
                              {prioInfo.label}
                            </Badge>
                            {n.isExpired && (
                              <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-500">
                                Expirée
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <TargetIcon className="h-3 w-3" />
                              {n.target === "ALL" && "Tous"}
                              {n.target === "SITE" && (n.siteName ?? "Site")}
                              {n.target === "INDIVIDUAL" && (n.employeeName ?? "Employé")}
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              {n.readCount} lu{n.readCount > 1 ? "s" : ""}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {fmtDate(n.createdAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => handleDelete(n.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
