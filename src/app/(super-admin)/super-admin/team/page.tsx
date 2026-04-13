"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield, UserPlus, Trash2, Loader2, Crown, ShieldCheck, Eye,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

import {
  listSuperAdminsAction,
  addSuperAdminAction,
  removeSuperAdminAction,
  updateSuperAdminRoleAction,
  getCurrentAdminRoleAction,
} from "../actions";

const ROLE_CONFIG: Record<string, { label: string; description: string; icon: typeof Shield; cls: string }> = {
  owner: { label: "Propriétaire", description: "Accès total, gère les admins", icon: Crown, cls: "bg-amber-100 text-amber-700 border-amber-200" },
  admin: { label: "Administrateur", description: "Accès complet, pas de gestion admins", icon: ShieldCheck, cls: "bg-blue-100 text-blue-700 border-blue-200" },
  viewer: { label: "Lecteur", description: "Consultation seule", icon: Eye, cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

type Admin = Awaited<ReturnType<typeof listSuperAdminsAction>>[number];

export default function TeamPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState("admin");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, role] = await Promise.all([
        listSuperAdminsAction(),
        getCurrentAdminRoleAction(),
      ]);
      setAdmins(list);
      setIsOwner(role === "owner");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleAdd() {
    if (!addEmail.trim()) return;
    setActionLoading("add");
    try {
      const res = await addSuperAdminAction(addEmail.trim(), addName.trim(), addRole);
      if (!res.success) { toast.error(res.error ?? "Erreur"); return; }
      toast.success(`${addEmail} ajouté comme ${ROLE_CONFIG[addRole]?.label ?? addRole}`);
      setShowAdd(false);
      setAddEmail("");
      setAddName("");
      setAddRole("admin");
      void load();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemove(admin: Admin) {
    if (!confirm(`Retirer ${admin.fullName} (${admin.email}) de l'équipe Super Admin ?`)) return;
    setActionLoading(admin.id);
    try {
      const res = await removeSuperAdminAction(admin.id);
      if (!res.success) { toast.error(res.error ?? "Erreur"); return; }
      toast.success(`${admin.fullName} retiré de l'équipe`);
      void load();
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRoleChange(admin: Admin, newRole: string) {
    if (newRole === admin.superAdminRole) return;
    setActionLoading(admin.id);
    try {
      const res = await updateSuperAdminRoleAction(admin.id, newRole);
      if (!res.success) { toast.error(res.error ?? "Erreur"); return; }
      toast.success(`Rôle de ${admin.fullName} changé en ${ROLE_CONFIG[newRole]?.label ?? newRole}`);
      void load();
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Équipe Super Admin</h1>
          <p className="text-sm text-slate-500">Gérez les accès à l&apos;espace d&apos;administration</p>
        </div>
        {isOwner && (
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Ajouter un admin
          </Button>
        )}
      </div>

      {/* Role explanation */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {Object.entries(ROLE_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <Card key={key} className="border-0 shadow-sm">
              <CardContent className="flex items-start gap-3 p-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${cfg.cls}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{cfg.label}</p>
                  <p className="text-xs text-slate-500">{cfg.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Admin list */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-red-500" />
            Membres de l&apos;équipe ({admins.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
          ) : admins.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-400">Aucun administrateur</p>
          ) : (
            <div className="divide-y">
              {admins.map((admin) => {
                const role = admin.superAdminRole ?? "viewer";
                const cfg = ROLE_CONFIG[role] ?? ROLE_CONFIG.viewer;
                const Icon = cfg.icon;
                const isCurrentOwner = role === "owner";
                const isActionLoading = actionLoading === admin.id;

                return (
                  <div key={admin.id} className="flex items-center gap-4 px-4 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${cfg.cls}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{admin.fullName}</p>
                        <Badge variant="outline" className={`text-[10px] ${cfg.cls}`}>{cfg.label}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{admin.email}</p>
                      <p className="text-[10px] text-slate-400">
                        Dernière connexion : {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleString("fr-FR") : "Jamais"}
                      </p>
                    </div>

                    {isOwner && !isCurrentOwner && (
                      <div className="flex items-center gap-2">
                        <Select value={role} onValueChange={(v) => void handleRoleChange(admin, v ?? role)} disabled={isActionLoading}>
                          <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrateur</SelectItem>
                            <SelectItem value="viewer">Lecteur</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isActionLoading}
                          onClick={() => void handleRemove(admin)}
                          className="text-destructive hover:border-destructive hover:bg-destructive/10"
                        >
                          {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    )}

                    {isCurrentOwner && (
                      <span className="text-xs text-amber-600 font-medium">Vous</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un administrateur</DialogTitle>
            <DialogDescription>
              L&apos;utilisateur doit avoir un compte OControle existant. Entrez son email pour le promouvoir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-email">Email du compte</Label>
              <Input
                id="add-email"
                type="email"
                placeholder="utilisateur@email.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-name">Nom complet</Label>
              <Input
                id="add-name"
                type="text"
                placeholder="Nom complet"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v ?? "admin")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <div>
                        <p className="font-medium">Administrateur</p>
                        <p className="text-xs text-slate-500">Accès complet, pas de gestion admins</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-slate-600" />
                      <div>
                        <p className="font-medium">Lecteur</p>
                        <p className="text-xs text-slate-500">Consultation seule</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button
              onClick={() => void handleAdd()}
              disabled={!addEmail.trim() || actionLoading === "add"}
              className="gap-2"
            >
              {actionLoading === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
