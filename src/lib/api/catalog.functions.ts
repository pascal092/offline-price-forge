import { createServerFn } from "@tanstack/react-start";

import { getSupabaseAdmin } from "../supabase.server";
import type { Article, PriceListKey } from "../pricing/types";

// Server-Funktion: lädt den Artikelkatalog aus Supabase (Tabelle `artikel`)
// und mappt ihn auf den App-Typ `Article`. Läuft serverseitig — der
// service_role-Key bleibt im Server-Bundle und erreicht nie den Browser.

// Rohzeile aus Supabase (Spalten der Tabelle public.artikel)
type ArtikelRow = {
  artikel_nr: string;
  bezeichnung: string | null;
  bezeichnung2: string | null;
  vpe: string | null;
  einheit: string | null;
  verpackung: string | null;
  preis_a: number | string | null;
  preis_b: number | string | null;
  preis_c: number | string | null;
  preis_d: number | string | null;
  preis_e: number | string | null;
  preis_f: number | string | null;
};

function num(v: number | string | null): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapRow(row: ArtikelRow): Article {
  const prices = {
    "Preisliste A": num(row.preis_a),
    "Preisliste B": num(row.preis_b),
    "Preisliste C": num(row.preis_c),
    "Preisliste D": num(row.preis_d),
    "Preisliste E": num(row.preis_e),
    "Preisliste F": num(row.preis_f),
  } as Record<PriceListKey, number | null>;

  return {
    artikel_nr: row.artikel_nr,
    bezeichnung_1: row.bezeichnung ?? "",
    bezeichnung_2: row.bezeichnung2 ?? "",
    verpackungseinheit: row.verpackung ?? "",
    vpe: row.vpe ?? "",
    palettenmenge: "",
    me: row.einheit ?? "",
    prices,
  };
}

export const getCatalogFromSupabase = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ articles: Article[]; rows: number }> => {
    const supabase = getSupabaseAdmin();

    // Alle Artikel laden (Supabase liefert standardmäßig max. 1000 Zeilen —
    // aktuell 505, daher reicht ein Aufruf; range() als Sicherheit).
    const { data, error } = await supabase
      .from("artikel")
      .select(
        "artikel_nr,bezeichnung,bezeichnung2,vpe,einheit,verpackung,preis_a,preis_b,preis_c,preis_d,preis_e,preis_f",
      )
      .order("artikel_nr", { ascending: true })
      .range(0, 9999);

    if (error) {
      throw new Error(`Supabase-Abfrage fehlgeschlagen: ${error.message}`);
    }

    const articles = (data as ArtikelRow[]).map(mapRow);
    return { articles, rows: articles.length };
  },
);
