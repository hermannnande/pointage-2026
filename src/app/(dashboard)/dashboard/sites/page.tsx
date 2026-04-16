"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { deleteSiteAction, getSitesAction } from "./actions";

type SiteRow = Awaited<ReturnType<typeof getSitesAction>>[number];

export default function SitesPage() {
  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSites = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSitesAction();
      setSites(data);
    } catch {
      toast.error("Impossible de charger les lieux de travail");
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      if (
        !window.confirm(
          `Supprimer le lieu de travail « ${name} » ? Cette action est irréversible.`,
        )
      ) {
        return;
      }
      const result = await deleteSiteAction(id);
      if (result.success) {
        toast.success("Lieu de travail supprimé");
        void loadSites();
      } else {
        toast.error(result.error ?? "Échec de la suppression");
      }
    },
    [loadSites],
  );

  const columns = useMemo<ColumnDef<SiteRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Nom",
        cell: ({ row }) => row.original.name,
      },
      {
        accessorKey: "city",
        header: "Ville",
        cell: ({ row }) => row.original.city ?? "—",
      },
      {
        id: "horaires",
        header: "Horaires",
        cell: ({ row }) => {
          const start = row.original.workStartTime ?? "—";
          const end = row.original.workEndTime ?? "—";
          return `${start} – ${end}`;
        },
      },
      {
        id: "employees",
        header: "Employés",
        cell: ({ row }) => row.original._count.employees,
      },
      {
        id: "statut",
        header: "Statut",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "default" : "secondary"}>
            {row.original.isActive ? "Actif" : "Inactif"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const site = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/sites/${site.id}`}>
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                type="button"
                onClick={() => void handleDelete(site.id, site.name)}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </div>
          );
        },
      },
    ],
    [handleDelete],
  );

  return (
    <>
      <PageHeader
        title="Lieux de travail"
        description="Définissez les lieux autorisés pour le pointage de vos employés : boutique, bureau, atelier..."
      >
        <Button asChild>
          <Link href="/dashboard/sites/new">
            <Plus className="h-4 w-4" />
            Nouveau lieu
          </Link>
        </Button>
      </PageHeader>
      {loading ? (
        <div className="h-64 w-full animate-pulse rounded-lg bg-muted" />
      ) : (
        <DataTable
          columns={columns}
          data={sites}
          emptyMessage="Ajoutez un lieu de travail pour définir où vos employés peuvent pointer."
        />
      )}
    </>
  );
}
