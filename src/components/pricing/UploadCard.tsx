import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { parseExcelFile } from "@/lib/excel/parse";
import { replaceCatalog } from "@/lib/db/idb";
import { getCatalogFromSupabase } from "@/lib/api/catalog.functions";
import { toast } from "sonner";
import type { CatalogMeta } from "@/lib/pricing/types";

type Props = {
  meta: CatalogMeta | null;
  onImported: () => void;
};

export function UploadCard({ meta, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  async function handleSupabaseSync() {
    setSyncing(true);
    try {
      const result = await getCatalogFromSupabase();
      await replaceCatalog(result.articles, {
        filename: "Supabase (zentrale Preisliste)",
        importedAt: Date.now(),
        rows: result.rows,
      });
      toast.success("Preisliste aus Supabase geladen", {
        description: `${result.rows.toLocaleString("de-DE")} Artikel wurden aktualisiert.`,
      });
      onImported();
    } catch (err) {
      toast.error("Laden aus Supabase fehlgeschlagen", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const result = await parseExcelFile(file);
      if (!result.ok) {
        toast.error("Import fehlgeschlagen", { description: result.error });
        return;
      }
      await replaceCatalog(result.articles, {
        filename: file.name,
        importedAt: Date.now(),
        rows: result.rows,
      });
      toast.success("Preisliste importiert", {
        description: `${result.rows.toLocaleString("de-DE")} Artikel wurden lokal gespeichert.`,
      });
      onImported();
    } catch (err) {
      toast.error("Datei konnte nicht gelesen werden", {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          Stammdaten-Preisliste (Excel)
        </CardTitle>
        <CardDescription>
          Lädt die zentrale Preisliste aus Supabase oder alternativ eine Excel-Datei lokal in den
          Browser. Der Katalog wird für die Offline-Nutzung im Gerät gespeichert.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <Database className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div>
              <p className="font-medium">Zentrale Preisliste (Supabase)</p>
              <p className="text-sm text-muted-foreground">
                Empfohlen: Lädt die aktuelle Preisliste aus der zentralen Datenbank.
              </p>
            </div>
          </div>
          <Button
            size="lg"
            onClick={() => void handleSupabaseSync()}
            disabled={syncing}
            className="min-h-11"
            data-testid="button-supabase-sync"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Wird geladen…" : "Aus Supabase laden"}
          </Button>
        </div>

        <div className="relative py-1 text-center">
          <span className="bg-card px-3 text-xs uppercase tracking-wide text-muted-foreground">
            oder Excel manuell importieren
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
          }`}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Excel-Datei hierher ziehen</p>
            <p className="text-sm text-muted-foreground">oder Datei auswählen (.xlsx, .xls)</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              e.target.value = "";
            }}
          />
          <Button
            size="lg"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="min-h-11"
          >
            {busy ? "Wird importiert…" : "Datei auswählen"}
          </Button>
        </div>

        {meta && (
          <div className="flex items-start gap-2 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <div>
              <div className="font-medium">{meta.filename}</div>
              <div className="text-emerald-800/80 dark:text-emerald-100/80">
                {meta.rows.toLocaleString("de-DE")} Artikel · importiert am{" "}
                {new Date(meta.importedAt).toLocaleString("de-DE")}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
