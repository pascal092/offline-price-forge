import type { Project } from "@/lib/pricing/types";

function esc(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function projectsToCSV(projects: Project[]): string {
  const headers = [
    "Erstellt am",
    "Kundenname",
    "Kundenkategorie",
    "Kundenart",
    "Klassifizierung",
    "Dachgröße (m²)",
    "Aufbaupreis (€/m²)",
    "Projektwert (€)",
    "Tier",
    "Preisliste",
  ];
  const lines = [headers.join(";")];
  for (const p of projects) {
    lines.push(
      [
        new Date(p.createdAt).toLocaleString("de-DE"),
        p.kundenname,
        p.kundenkategorie,
        p.kundenart,
        p.klassifizierung,
        p.dachgroesse_m2.toString().replace(".", ","),
        p.aufbaupreis_eur_m2.toString().replace(".", ","),
        p.projektwert.toFixed(2).replace(".", ","),
        p.tier,
        p.priceListColumn,
      ]
        .map(esc)
        .join(";"),
    );
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
