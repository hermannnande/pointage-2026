"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { Eye, Search, Upload, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/tables/data-table";
import { Pagination } from "@/components/tables/pagination";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { getEmployeesAction, getSitesForSelectAction } from "./actions";

const ALL_SITES_VALUE = "__all__";

type EmployeesPayload = Awaited<ReturnType<typeof getEmployeesAction>>;
type EmployeeRow = EmployeesPayload["employees"][number];
type SiteOption = Awaited<ReturnType<typeof getSitesForSelectAction>>[number];

function employeeInitials(firstName: string, lastName: string) {
  const a = (firstName.trim()[0] ?? "").toUpperCase();
  const b = (lastName.trim()[0] ?? "").toUpperCase();
  return `${a}${b}` || "?";
}

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState(ALL_SITES_VALUE);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [payload, setPayload] = useState<EmployeesPayload | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, siteFilter]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSitesLoading(true);
      try {
        const data = await getSitesForSelectAction();
        if (!cancelled) setSites(data);
      } catch {
        if (!cancelled) {
          toast.error("Impossible de charger les sites");
          setSites([]);
        }
      } finally {
        if (!cancelled) setSitesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getEmployeesAction({
        search: debouncedSearch.trim() || undefined,
        siteId:
          siteFilter === ALL_SITES_VALUE ? undefined : siteFilter || undefined,
        page,
      });
      setPayload(data);
    } catch {
      toast.error("Impossible de charger les employés");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, siteFilter, page]);

  useEffect(() => {
    void loadEmployees();
  }, [loadEmployees]);

  const columns = useMemo<ColumnDef<EmployeeRow>[]>(
    () => [
      {
        id: "employee",
        header: "Employé",
        cell: ({ row }) => {
          const e = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="text-xs font-medium">
                  {employeeInitials(e.firstName, e.lastName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">
                {e.firstName} {e.lastName}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email ?? "—",
      },
      {
        accessorKey: "phone",
        header: "Téléphone",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "position",
        header: "Poste",
        cell: ({ row }) => row.original.position ?? "—",
      },
      {
        id: "site",
        header: "Site",
        cell: ({ row }) => row.original.site?.name ?? "—",
      },
      {
        id: "contract",
        header: "Contrat",
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.contractType}</Badge>
        ),
      },
      {
        id: "status",
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
        cell: ({ row }) => (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/employees/${row.original.id}`}>
              <Eye className="h-4 w-4" />
              <span className="sr-only">Voir</span>
            </Link>
          </Button>
        ),
      },
    ],
    [],
  );

  if (loading && !payload) {
    return (
      <>
        <PageHeader
          title="Employés"
          description="Gérez votre équipe"
        >
          <Button variant="outline" asChild>
            <Link href="/dashboard/employees/import">
              <Upload className="h-4 w-4" />
              Importer CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/employees/new">
              <UserPlus className="h-4 w-4" />
              Nouvel employé
            </Link>
          </Button>
        </PageHeader>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-2 rounded-lg border bg-card p-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </>
    );
  }

  const employees = payload?.employees ?? [];
  const total = payload?.total ?? 0;
  const totalPages = Math.max(1, payload?.totalPages ?? 1);
  const pageSize = payload?.pageSize ?? 25;
  const currentPage = payload?.page ?? page;

  return (
    <>
      <PageHeader
        title="Employés"
        description="Gérez votre équipe"
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/employees/import">
            <Upload className="h-4 w-4" />
            Importer CSV
          </Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/employees/new">
            <UserPlus className="h-4 w-4" />
            Nouvel employé
          </Link>
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Recherche employés"
          />
        </div>
        <Select
          value={siteFilter}
          onValueChange={(v) => setSiteFilter(v || ALL_SITES_VALUE)}
          disabled={sitesLoading}
        >
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="Filtrer par site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SITES_VALUE}>Tous les sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={loading ? "pointer-events-none opacity-60" : ""}>
        <DataTable
          columns={columns}
          data={employees}
          emptyMessage="Aucun employé pour le moment."
        />
      </div>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
      />
    </>
  );
}
