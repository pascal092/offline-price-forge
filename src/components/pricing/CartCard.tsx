import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Trash2, FileText } from "lucide-react";
import type { CartItem } from "@/lib/pricing/cart";
import { cartTotal } from "@/lib/pricing/cart";
import { formatEUR } from "@/lib/pricing/tiers";

type Props = {
  items: CartItem[];
  onChangeQuantity: (artikel_nr: string, qty: number) => void;
  onRemove: (artikel_nr: string) => void;
  onClear: () => void;
  onGeneratePDF: () => void;
  canGenerate: boolean;
};

export function CartCard({
  items,
  onChangeQuantity,
  onRemove,
  onClear,
  onGeneratePDF,
  canGenerate,
}: Props) {
  const total = cartTotal(items);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          Warenkorb / Angebot
          {items.length > 0 && (
            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {items.length}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Artikel aus der Sandbox hinzufügen, Mengen anpassen und Angebot als PDF erzeugen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Noch keine Artikel im Warenkorb. Nutzen Sie die Artikel-Sandbox unten, um Positionen
            hinzuzufügen.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Artikel-Nr.</TableHead>
                    <TableHead>Bezeichnung</TableHead>
                    <TableHead className="w-24">Menge</TableHead>
                    <TableHead className="w-28 text-right">Einzelpreis</TableHead>
                    <TableHead className="w-28 text-right">Gesamt</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.artikel_nr}>
                      <TableCell className="font-mono text-xs">{i.artikel_nr}</TableCell>
                      <TableCell>
                        <div className="font-medium">{i.bezeichnung_1}</div>
                        {i.bezeichnung_2 && (
                          <div className="text-xs text-muted-foreground">{i.bezeichnung_2}</div>
                        )}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {i.priceColumn} · {i.me || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          value={i.quantity}
                          onChange={(e) =>
                            onChangeQuantity(i.artikel_nr, parseFloat(e.target.value) || 0)
                          }
                          className="h-9 w-20 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatEUR(i.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatEUR(i.unitPrice * i.quantity)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onRemove(i.artikel_nr)}
                          aria-label="Entfernen"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="text-sm font-medium text-muted-foreground">Summe (netto)</span>
              <span className="font-mono text-lg font-bold">{formatEUR(total)}</span>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClear}>
                Warenkorb leeren
              </Button>
              <Button
                onClick={onGeneratePDF}
                disabled={!canGenerate}
                className="gap-2"
                size="lg"
              >
                <FileText className="h-5 w-5" />
                Angebot als PDF
              </Button>
            </div>
            {!canGenerate && (
              <p className="text-right text-xs text-muted-foreground">
                Bitte Kundenname, Dachgröße und Aufbaupreis eingeben.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
