"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { importEmployeesAction } from "../actions";

type ImportRow = {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  matricule?: string;
  position?: string;
  contractType?: string;
};

function normalizeHeader(cell: string) {
  return cell.trim().toLowerCase().replace(/\s+/g, "");
}

function detectDelimiter(line: string) {
  const sc = (line.match(/;/g) || []).length;
  const cc = (line.match(/,/g) || []).length;
  return sc > cc ? ";" : ",";
}

function splitRow(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
}

function parseCsvFileContent(text: string): ImportRow[] {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());
  const lines = rawLines.filter((l) => l.length > 0);
  if (lines.length === 0) return [];

  const sep0 = detectDelimiter(lines[0]);
  const firstCells = splitRow(lines[0], sep0);
  const norm = firstCells.map(normalizeHeader);
  const hasHeader =
    norm.includes("firstname") &&
    norm.includes("lastname");

  let start = 0;
  let columnIndex: Record<string, number> | null = null;

  if (hasHeader) {
    start = 1;
    columnIndex = {
      firstName: norm.indexOf("firstname"),
      lastName: norm.indexOf("lastname"),
      email: norm.indexOf("email"),
      phone: norm.indexOf("phone"),
      matricule: norm.indexOf("matricule"),
      position: norm.indexOf("position"),
      contractType: norm.indexOf("contracttype"),
    };
  }

  const out: ImportRow[] = [];

  for (let i = start; i < lines.length; i++) {
    const sep = detectDelimiter(lines[i]);
    const cells = splitRow(lines[i], sep);
    if (columnIndex) {
      const col = columnIndex;
      const g = (key: keyof typeof col) => {
        const idx = col[key];
        if (idx < 0) return undefined;
        return cells[idx]?.trim() || undefined;
      };
      out.push({
        firstName: g("firstName") ?? "",
        lastName: g("lastName") ?? "",
        email: g("email"),
        phone: g("phone"),
        matricule: g("matricule"),
        position: g("position"),
        contractType: g("contractType"),
      });
    } else {
      out.push({
        firstName: cells[0]?.trim() ?? "",
        lastName: cells[1]?.trim() ?? "",
        email: cells[2]?.trim() || undefined,
        phone: cells[3]?.trim() || undefined,
        matricule: cells[4]?.trim() || undefined,
        position: cells[5]?.trim() || undefined,
        contractType: cells[6]?.trim() || undefined,
      });
    }
  }

  return out.filter((r) => r.firstName.length > 0 || r.lastName.length > 0);
}

const PREVIEW_ROWS = 5;

export default function ImportEmployeesPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: number;
    errors: { row: number; message: string }[];
  } | null>(null);

  const preview = useMemo(() => rows.slice(0, PREVIEW_ROWS), [rows]);
  const validCount = useMemo(
    () => rows.filter((r) => r.firstName.trim() && r.lastName.trim()).length,
    [rows],
  );

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setLastResult(null);
    if (!file) {
      setRows([]);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Veuillez sélectionner un fichier .csv");
      setRows([]);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      try {
        const parsed = parseCsvFileContent(text);
        setRows(parsed);
        if (parsed.length === 0) {
          toast.message("Aucune ligne exploitable dans ce fichier");
        }
      } catch {
        toast.error("Impossible de lire le fichier CSV");
        setRows([]);
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  async function handleImport() {
    const toSend = rows.filter(
      (r) => r.firstName.trim() && r.lastName.trim(),
    );
    if (toSend.length === 0) {
      toast.error("Aucun employé valide à importer (prénom et nom requis)");
      return;
    }
    setImporting(true);
    setLastResult(null);
    try {
      const result = await importEmployeesAction(toSend);
      if (result.success && result.data) {
        setLastResult(result.data);
        toast.success("Import terminé");
      } else {
        toast.error(result.error ?? "Échec de l'import");
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Importer des employés"
        description="Importez vos employés depuis un fichier CSV"
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Fichier CSV</CardTitle>
          <CardDescription>
            Le fichier CSV doit contenir les colonnes suivantes : firstName,
            lastName, email, phone, matricule, position, contractType
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <label
              htmlFor="csv-file"
              className="text-sm font-medium leading-none"
            >
              Choisir un fichier
            </label>
            <InputLikeFile id="csv-file" onChange={onFileChange} />
          </div>

          {preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                Aperçu ({Math.min(PREVIEW_ROWS, preview.length)} premières
                lignes)
              </p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">
                        Prénom
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Nom</th>
                      <th className="px-3 py-2 text-left font-medium">Email</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Téléphone
                      </th>
                      <th className="px-3 py-2 text-left font-medium">
                        Matricule
                      </th>
                      <th className="px-3 py-2 text-left font-medium">Poste</th>
                      <th className="px-3 py-2 text-left font-medium">
                        Contrat
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, idx) => (
                      <tr key={idx} className="border-b last:border-0">
                        <td className="px-3 py-2">{r.firstName}</td>
                        <td className="px-3 py-2">{r.lastName}</td>
                        <td className="px-3 py-2">{r.email ?? "—"}</td>
                        <td className="px-3 py-2">{r.phone ?? "—"}</td>
                        <td className="px-3 py-2">{r.matricule ?? "—"}</td>
                        <td className="px-3 py-2">{r.position ?? "—"}</td>
                        <td className="px-3 py-2">{r.contractType ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {lastResult && (
            <div
              className="rounded-lg border bg-muted/30 px-4 py-3 text-sm"
              role="status"
            >
              <p>
                <strong>{lastResult.success}</strong> importé
                {lastResult.success > 1 ? "s" : ""} avec succès
                {lastResult.errors.length > 0 && (
                  <>
                    , <strong>{lastResult.errors.length}</strong> erreur
                    {lastResult.errors.length > 1 ? "s" : ""}
                  </>
                )}
                .
              </p>
              {lastResult.errors.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-destructive">
                  {lastResult.errors.map((err) => (
                    <li key={`${err.row}-${err.message}`}>
                      Ligne {err.row} : {err.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2 border-t bg-transparent">
          <Button
            type="button"
            disabled={importing || validCount === 0}
            onClick={() => void handleImport()}
          >
            {importing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Import en cours…
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Importer {validCount} employé{validCount > 1 ? "s" : ""}
              </>
            )}
          </Button>
          <Button variant="outline" asChild disabled={importing}>
            <Link href="/dashboard/employees">Retour à la liste</Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}

function InputLikeFile({
  id,
  onChange,
}: {
  id: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      id={id}
      type="file"
      accept=".csv,text/csv"
      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
      onChange={onChange}
    />
  );
}
