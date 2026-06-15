import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Calculator } from "lucide-react";
import { formatEUR } from "@/lib/pricing/tiers";
import type { TierResult } from "@/lib/pricing/types";

type Props = {
  projektwert: number;
  tier: TierResult;
  hasInputs: boolean;
};

export function ResultBadge({ projektwert, tier, hasInputs }: Props) {
  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10">
      <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calculator className="h-4 w-4" />
            Errechneter Projektwert
          </div>
          <div className="mt-1 text-3xl font-bold tracking-tight">
            {hasInputs ? formatEUR(projektwert) : "—"}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Dachgröße × Aufbaupreis pro m²
          </div>
        </div>

        {hasInputs && (
          <div className="flex flex-col items-start gap-2 md:items-end">
            <Badge className="gap-1.5 bg-emerald-600 px-3 py-1.5 text-sm hover:bg-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Zugeordnete Objektkondition: {tier.label}
            </Badge>
            <div className="text-xs text-muted-foreground md:text-right">
              Spalte: <span className="font-mono">{tier.column}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
