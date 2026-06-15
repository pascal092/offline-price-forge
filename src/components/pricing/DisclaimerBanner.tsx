import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <Alert className="border-amber-400 bg-amber-50 text-amber-950 dark:border-amber-500/60 dark:bg-amber-950/40 dark:text-amber-100">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="font-semibold">Wichtiger Hinweis zur Preiseinstufung</AlertTitle>
      <AlertDescription className="text-sm leading-relaxed">
        Achtung: Für die Einstufung in die Preislisten zählt ausschließlich reine Handelsware!
        Substrate/Erden entfallen komplett in der Berechnung des Systemwerts.
      </AlertDescription>
    </Alert>
  );
}
