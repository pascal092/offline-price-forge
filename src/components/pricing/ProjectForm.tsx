import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList } from "lucide-react";

export type ProjectInput = {
  kundenname: string;
  kundenkategorie: string;
  kundenart: string;
  klassifizierung: string;
  dachgroesse_m2: string;
  aufbaupreis_eur_m2: string;
};

type Props = {
  value: ProjectInput;
  onChange: (next: ProjectInput) => void;
};

const KATEGORIEN = ["Fachhandel", "Bedacher", "Architekt/Planer", "GaLaBau", "Bauträger", "Sonstige"];
const KUNDENART = ["Neukunde", "Bestandskunde", "Schlüsselkunde", "Projektkunde"];
const KLASSIFIZIERUNG = ["A — Top", "B — Wichtig", "C — Standard", "D — Gelegentlich"];

export function ProjectForm({ value, onChange }: Props) {
  function set<K extends keyof ProjectInput>(key: K, v: ProjectInput[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Projektdaten
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <Field label="Kundenname">
          <Input
            value={value.kundenname}
            onChange={(e) => set("kundenname", e.target.value)}
            placeholder="z.B. Mustermann GmbH"
            className="h-12 text-base"
          />
        </Field>

        <Field label="Kundenkategorie">
          <Select value={value.kundenkategorie} onValueChange={(v) => set("kundenkategorie", v)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {KATEGORIEN.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Kundenart">
          <Select value={value.kundenart} onValueChange={(v) => set("kundenart", v)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {KUNDENART.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Projekt-Klassifizierung">
          <Select value={value.klassifizierung} onValueChange={(v) => set("klassifizierung", v)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {KLASSIFIZIERUNG.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Dachgröße in m²" hint="Nur Handelsware zählen">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={value.dachgroesse_m2}
            onChange={(e) => set("dachgroesse_m2", e.target.value)}
            placeholder="z.B. 850"
            className="h-12 text-base"
          />
        </Field>

        <Field
          label="Erwarteter System-Aufbaupreis pro m² in €"
          hint="Ohne Substrat / Erden"
        >
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={value.aufbaupreis_eur_m2}
            onChange={(e) => set("aufbaupreis_eur_m2", e.target.value)}
            placeholder="z.B. 45,00"
            className="h-12 text-base"
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
