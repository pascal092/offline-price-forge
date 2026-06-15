export const PRICE_LIST_COLUMNS = [
  "A - Liste",
  "B - Liste",
  "C - Liste",
  "D - Liste bzw. Großdepot Mind. Preis",
  "E - Liste bzw. Depot Mind. Preis",
  "F - Liste (Handelspreisliste)",
  "Standardpreisliste",
] as const;

export type PriceListKey = (typeof PRICE_LIST_COLUMNS)[number];

export const REQUIRED_COLUMNS = [
  "artikel_nr",
  "bezeichnung_1",
  "bezeichnung_2",
  "verpackungseinheit",
  "vpe",
  "palettenmenge",
  "me",
  ...PRICE_LIST_COLUMNS,
] as const;

export type Article = {
  artikel_nr: string;
  bezeichnung_1: string;
  bezeichnung_2: string;
  verpackungseinheit: string;
  vpe: string;
  palettenmenge: string;
  me: string;
  prices: Record<PriceListKey, number | null>;
};

export type TierLetter = "A" | "B" | "C" | "D" | "E" | "F";

export type TierResult = {
  tier: TierLetter;
  column: PriceListKey;
  label: string;
};

export type Project = {
  id: string;
  createdAt: number;
  kundenname: string;
  kundenkategorie: string;
  kundenart: string;
  klassifizierung: string;
  dachgroesse_m2: number;
  aufbaupreis_eur_m2: number;
  projektwert: number;
  tier: TierLetter;
  priceListColumn: PriceListKey;
};

export type CatalogMeta = {
  filename: string;
  importedAt: number;
  rows: number;
};
