import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search } from "lucide-react";
import { formatEUR } from "@/lib/pricing/tiers";
import type { Article, PriceListKey } from "@/lib/pricing/types";

type Props = {
  articles: Article[];
  activeColumn: PriceListKey | null;
};

export function ArticleLookup({ articles, activeColumn }: Props) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (articles.length === 0) return [];
    const q = query.trim().toLowerCase();
    if (!q) return articles.slice(0, 25);
    return articles
      .filter(
        (a) =>
          a.artikel_nr.toLowerCase().includes(q) ||
          a.bezeichnung_1.toLowerCase().includes(q) ||
          a.bezeichnung_2.toLowerCase().includes(q),
      )
      .slice(0, 100);
  }, [articles, query]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Artikel-Sandbox
        </CardTitle>
        <CardDescription>
          {activeColumn ? (
            <>
              Preise aus Spalte <span className="font-mono">{activeColumn}</span>
            </>
          ) : (
            "Geben Sie Projektdaten ein, um die passende Preisspalte zu sehen."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artikel-Nr. oder Bezeichnung suchen…"
          className="h-12 text-base"
        />

        {articles.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Noch keine Preisliste importiert.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Artikel-Nr.</TableHead>
                  <TableHead>Bezeichnung</TableHead>
                  <TableHead className="w-20">VPE</TableHead>
                  <TableHead className="w-20">ME</TableHead>
                  <TableHead className="w-32 text-right">
                    {activeColumn ? "Preis" : "Standardpreis"}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Keine Treffer.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((a) => {
                    const col = activeColumn ?? "F-Liste";
                    const price = a.prices[col];
                    return (
                      <TableRow key={a.artikel_nr}>
                        <TableCell className="font-mono text-xs">{a.artikel_nr}</TableCell>
                        <TableCell>
                          <div className="font-medium">{a.bezeichnung_1}</div>
                          {a.bezeichnung_2 && (
                            <div className="text-xs text-muted-foreground">{a.bezeichnung_2}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{a.vpe || "—"}</TableCell>
                        <TableCell className="text-sm">{a.me || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{formatEUR(price)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
        {articles.length > 0 && !query && (
          <p className="text-xs text-muted-foreground">
            Zeige die ersten 25 von {articles.length.toLocaleString("de-DE")} Artikeln. Tippen Sie
            zum Filtern.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
