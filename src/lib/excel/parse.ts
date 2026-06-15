import * as XLSX from "xlsx";
import type { Article, PriceListKey } from "@/lib/pricing/types";
import { PRICE_LIST_COLUMNS, REQUIRED_COLUMNS } from "@/lib/pricing/types";

export type ParseResult =
  | { ok: true; articles: Article[]; rows: number }
  | { ok: false; error: string; missing?: string[] };

function coerceNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const cleaned = value.trim().replace(/[€\s]/g, "").replace(/\./g, "").replace(/,/g, ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { ok: false, error: "Die Datei enthält keine Arbeitsblätter." };
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  if (rows.length === 0) {
    return { ok: false, error: "Das erste Arbeitsblatt ist leer." };
  }

  const headers = new Set(Object.keys(rows[0]));
  const missing = REQUIRED_COLUMNS.filter((c) => !headers.has(c));
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Folgende Spalten fehlen in der Datei: ${missing.join(", ")}`,
      missing: [...missing],
    };
  }

  const articles: Article[] = [];
  for (const row of rows) {
    const artikel_nr = asString(row.artikel_nr);
    if (!artikel_nr) continue;
    const prices = {} as Record<PriceListKey, number | null>;
    for (const col of PRICE_LIST_COLUMNS) {
      prices[col] = coerceNumber(row[col]);
    }
    articles.push({
      artikel_nr,
      bezeichnung_1: asString(row.bezeichnung_1),
      bezeichnung_2: asString(row.bezeichnung_2),
      verpackungseinheit: asString(row.verpackungseinheit),
      vpe: asString(row.vpe),
      palettenmenge: asString(row.palettenmenge),
      me: asString(row.me),
      prices,
    });
  }

  return { ok: true, articles, rows: articles.length };
}
