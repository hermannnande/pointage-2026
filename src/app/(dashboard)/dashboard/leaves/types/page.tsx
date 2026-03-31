"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

import {
  getLeaveTypesAction,
  createLeaveTypeAction,
  updateLeaveTypeAction,
  deleteLeaveTypeAction,
} from "../actions";

type LeaveTypeRow = Awaited<ReturnType<typeof getLeaveTypesAction>>[number];

const DEFAULT_COLOR = "#3B82F6";

function normalizeHexColor(value: string): string {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v;
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v}`;
  return DEFAULT_COLOR;
}

export default function LeaveTypesPage() {
  const [types, setTypes] = useState<LeaveTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [defaultDays, setDefaultDays] = useState(0);
  const [isPaid, setIsPaid] = useState(true);
  const [requiresDoc, setRequiresDoc] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const loadTypes = useCallback(async () => {
    try {
      const list = await getLeaveTypesAction();
      setTypes(list);
    } catch {
      toast.error("Impossible de charger les types de congés");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadTypes();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTypes]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setColor(DEFAULT_COLOR);
    setDefaultDays(0);
    setIsPaid(true);
    setRequiresDoc(false);
    setIsActive(true);
  }

  function startEdit(t: LeaveTypeRow) {
    setEditingId(t.id);
    setName(t.name);
    setColor(normalizeHexColor(t.color));
    setDefaultDays(t.defaultDays);
    setIsPaid(t.isPaid);
    setRequiresDoc(t.requiresDoc);
    setIsActive(t.isActive);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Le nom est obligatoire");
      return;
    }
    const hexColor = normalizeHexColor(color);

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await updateLeaveTypeAction({
          id: editingId,
          name: trimmed,
          color: hexColor,
          defaultDays,
          isPaid,
          requiresDoc,
          isActive,
        });
        if (!res.success) {
          toast.error(res.error ?? "Échec de la mise à jour");
          return;
        }
        toast.success("Type de congé mis à jour");
      } else {
        const res = await createLeaveTypeAction({
          name: trimmed,
          color: hexColor,
          defaultDays,
          isPaid,
          requiresDoc,
        });
        if (!res.success) {
          toast.error(res.error ?? "Échec de la création");
          return;
        }
        toast.success("Type de congé créé");
      }
      resetForm();
      await loadTypes();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Supprimer ce type de congé ?")) return;
    const res = await deleteLeaveTypeAction(id);
    if (!res.success) {
      toast.error(res.error ?? "Suppression impossible");
      return;
    }
    toast.success("Type de congé supprimé");
    if (editingId === id) resetForm();
    await loadTypes();
  }

  return (
    <>
      <PageHeader
        title="Types de congés"
        description="Configurez les types de congés disponibles"
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/leaves">Retour aux congés</Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {loading ? (
            <>
              <Skeleton className="h-36 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </>
          ) : types.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-sm text-muted-foreground">
                  Aucun type de congé. Créez-en un à droite.
                </p>
              </CardContent>
            </Card>
          ) : (
            types.map((t) => (
              <Card key={t.id}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-1 size-3 shrink-0 rounded-full ring-1 ring-border"
                      style={{ backgroundColor: t.color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{t.name}</p>
                        <Badge variant={t.isActive ? "default" : "secondary"}>
                          {t.isActive ? "Actif" : "Inactif"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t.defaultDays === 1
                          ? "1 jour par défaut"
                          : `${t.defaultDays} jours par défaut`}
                        {" · "}
                        {t.isPaid ? "Payé" : "Non payé"}
                        {" · "}
                        {t.requiresDoc
                          ? "Justificatif requis"
                          : "Justificatif non requis"}
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(t)}
                        >
                          <Pencil className="size-4" />
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(t.id)}
                        >
                          <Trash2 className="size-4" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? `Modifier : ${name}` : "Nouveau type"}
            </CardTitle>
          </CardHeader>
          <form onSubmit={(e) => void handleSubmit(e)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lt-name">Nom</Label>
                <Input
                  id="lt-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Congé annuel"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lt-color">Couleur</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="lt-color"
                    type="color"
                    className="h-10 w-14 cursor-pointer p-1"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">
                    Aperçu du repère visuel
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lt-days">Jours par défaut</Label>
                <Input
                  id="lt-days"
                  type="number"
                  min={0}
                  max={365}
                  value={Number.isNaN(defaultDays) ? "" : defaultDays}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setDefaultDays(Number.isNaN(n) ? 0 : Math.min(365, Math.max(0, n)));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Solde annuel de base
                </p>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  id="lt-paid"
                  checked={isPaid}
                  onCheckedChange={(checked: boolean) => setIsPaid(checked)}
                />
                <Label htmlFor="lt-paid" className="cursor-pointer font-normal">
                  Congé payé
                </Label>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch
                  id="lt-doc"
                  checked={requiresDoc}
                  onCheckedChange={(checked: boolean) =>
                    setRequiresDoc(checked)
                  }
                />
                <Label htmlFor="lt-doc" className="cursor-pointer font-normal">
                  Justificatif obligatoire
                </Label>
              </div>
              {editingId ? (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <Switch
                    id="lt-active"
                    checked={isActive}
                    onCheckedChange={(checked: boolean) =>
                      setIsActive(checked)
                    }
                  />
                  <Label
                    htmlFor="lt-active"
                    className="cursor-pointer font-normal"
                  >
                    Actif
                  </Label>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 border-t bg-transparent">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enregistrement…
                  </>
                ) : editingId ? (
                  "Enregistrer les modifications"
                ) : (
                  "Créer le type"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={submitting}
              >
                Réinitialiser
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
