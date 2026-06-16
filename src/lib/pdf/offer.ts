import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { CartItem, TierResult } from "@/lib/pricing/types";
import type { TierResult } from "@/lib/pricing/types";
import { formatEUR } from "@/lib/pricing/tiers";

export type OfferMeta = {
  kundenname: string;
  kundenkategorie: string;
  kundenart: string;
  klassifizierung: string;
  dachgroesse_m2: number;
  aufbaupreis_eur_m2: number;
  projektwert: number;
  tier: TierResult;
};

export function generateOfferPDF(items: CartItem[], meta: OfferMeta): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  let y = 16;

  // Header
  doc.setFillColor(34, 94, 56);
  doc.rect(0, 0, pageWidth, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("ZinCo GmbH", marginX, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Nürtingen · Projektangebot", marginX, 18);
  doc.text(
    `Datum: ${new Date().toLocaleDateString("de-DE")}`,
    pageWidth - marginX,
    18,
    { align: "right" },
  );

  doc.setTextColor(0, 0, 0);
  y = 38;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Angebot", marginX, y);
  y += 8;

  // Customer / project info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines: [string, string][] = [
    ["Kunde", meta.kundenname || "—"],
    ["Kundenkategorie", meta.kundenkategorie || "—"],
    ["Kundenart", meta.kundenart || "—"],
    ["Projekt-Klassifizierung", meta.klassifizierung || "—"],
    ["Dachgröße", `${meta.dachgroesse_m2.toLocaleString("de-DE")} m²`],
    ["Aufbaupreis", `${formatEUR(meta.aufbaupreis_eur_m2)} / m²`],
    ["Projektwert", formatEUR(meta.projektwert)],
    [
      "Zugeordnete Objektkondition",
      `${meta.tier.label} (Preisliste ${meta.tier.tier})`,
    ],
  ];
  for (const [k, v] of lines) {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, marginX, y);
    doc.setFont("helvetica", "normal");
    doc.text(v, marginX + 55, y);
    y += 5.5;
  }

  y += 4;

  // Items table
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  autoTable(doc, {
    startY: y,
    head: [["Artikel-Nr.", "Bezeichnung", "ME", "Menge", "Einzelpreis", "Gesamt"]],
    body: items.map((i) => [
      i.artikel_nr,
      `${i.bezeichnung_1}${i.bezeichnung_2 ? "\n" + i.bezeichnung_2 : ""}`,
      i.me || "—",
      i.quantity.toLocaleString("de-DE"),
      formatEUR(i.unitPrice),
      formatEUR(i.unitPrice * i.quantity),
    ]),
    foot: [["", "", "", "", "Summe (netto)", formatEUR(total)]],
    headStyles: { fillColor: [34, 94, 56], textColor: 255, fontStyle: "bold" },
    footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: "bold" },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 22 },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 26, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
    },
    margin: { left: marginX, right: marginX },
  });

  // Footer / disclaimer
  const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  let fy = finalY + 10;
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  const disclaimer =
    "Hinweis: Preise gelten für reine Handelsware ohne Substrat/Erden. Die zugeordnete Objektkondition basiert auf dem berechneten Projektwert. Alle Preise verstehen sich netto in Euro, zzgl. gesetzlicher MwSt. Angebot freibleibend.";
  const wrapped = doc.splitTextToSize(disclaimer, pageWidth - marginX * 2);
  doc.text(wrapped, marginX, fy);
  fy += wrapped.length * 4 + 6;
  doc.text(
    `Preisspalte: ${meta.tier.label} · Erstellt offline mit ZinCo Projektpreis-Rechner`,
    marginX,
    fy,
  );

  const filename = `Angebot_${(meta.kundenname || "Kunde").replace(/[^a-z0-9]+/gi, "_")}_${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  doc.save(filename);
}
