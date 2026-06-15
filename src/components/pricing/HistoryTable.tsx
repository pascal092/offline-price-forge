import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, Download, Trash2, ArrowUpDown } from "lucide-react";
import { formatEUR } from "@/lib/pricing/tiers";
import { projectsToCSV, downloadCSV } from "@/lib/csv";
import type { Project } from "@/lib/pricing/types";

type SortKey = "createdAt" | "kundenname" | "projektwert" | "tier";

type Props = {
  projects: Project[];
  onDelete: (id: string) => void;
};

export function HistoryTable({ projects, onDelete }: Props) {
  const [filter, setFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const list = q
      ? projects.filter(
          (p) =>
            p.kundenname.toLowerCase().includes(q) ||
            p.kundenkategorie.toLowerCase().includes(q) ||
            p.kundenart.toLowerCase().includes(q) ||
            p.tier.toLowerCase().includes(q),
        )
      : projects.slice();
    list.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "de");
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [projects, filter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function handleExport() {
    const csv = projectsToCSV(filtered);
    downloadCSV(`zinco-projekte-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Projekt-Historie
        </CardTitle>
        <CardDescription>
          Lokal auf diesem Gerät gespeichert. {projects.length.toLocaleString("de-DE")} Einträge.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter (Kunde, Kategorie, Tier…)"
            className="h-11"
          />
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="h-11 gap-2"
          >
            <Download className="h-4 w-4" />
            CSV exportieren
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Noch keine gespeicherten Projekte.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortBtn label="Datum" active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />
                  </TableHead>
                  <TableHead>
                    <SortBtn label="Kunde" active={sortKey === "kundenname"} dir={sortDir} onClick={() => toggleSort("kundenname")} />
                  </TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead className="text-right">Dach (m²)</TableHead>
                  <TableHead className="text-right">€ / m²</TableHead>
                  <TableHead className="text-right">
                    <SortBtn label="Projektwert" active={sortKey === "projektwert"} dir={sortDir} onClick={() => toggleSort("projektwert")} />
                  </TableHead>
                  <TableHead>
                    <SortBtn label="Tier" active={sortKey === "tier"} dir={sortDir} onClick={() => toggleSort("tier")} />
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(p.createdAt).toLocaleDateString("de-DE")}
                    </TableCell>
                    <TableCell className="font-medium">{p.kundenname}</TableCell>
                    <TableCell className="text-sm">{p.kundenkategorie}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {p.dachgroesse_m2.toLocaleString("de-DE")}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatEUR(p.aufbaupreis_eur_m2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatEUR(p.projektwert)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">Preisliste {p.tier}</Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(p.id)}
                        aria-label="Löschen"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SortBtn({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`-ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition-colors hover:bg-muted ${
        active ? "text-foreground" : "text-muted-foreground"
      }`}
    >
      {label}
      <ArrowUpDown className={`h-3 w-3 ${active ? "opacity-100" : "opacity-40"}`} />
      {active && <span className="text-[10px]">{dir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );
}
