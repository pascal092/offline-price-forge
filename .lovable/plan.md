# ZinCo Pricing PWA — Implementation Plan

A fully offline, tablet-friendly PWA that ingests a ZinCo master Excel price list, calculates the applicable price tier for a project, and lets the user look up article prices and save project history — all client-side.

## 1. Tech & Architecture

- TanStack Start (existing template), single client route `/` (no backend needed).
- **PWA**: use `vite-plugin-pwa` with `generateSW`, `registerType: "autoUpdate"`, guarded registration wrapper (no SW in Lovable preview / dev / iframe). Manifest with `display: "standalone"`, ZinCo-style theme colors, app icons (generated).
- **Offline storage**: IndexedDB via `idb` for (a) parsed article catalog, (b) saved project history, (c) uploaded file metadata (filename, import date, row count). localStorage only for small UI prefs.
- **Excel parsing**: `xlsx` (SheetJS) in the browser, no server round-trip.
- **CSV export**: built in-browser, Blob download.
- **UI**: shadcn components already in the project (Card, Input, Select, Button, Table, Badge, Dialog, Sonner toasts). Large touch targets, generous spacing for tablets.

## 2. Routes & Files

```text
src/routes/index.tsx                 — main app (single page, sectioned)
src/routes/__root.tsx                — add PWA <link rel="manifest">, theme-color, apple-touch-icon
public/manifest.webmanifest          — PWA manifest
public/icons/icon-192.png, 512.png   — generated
src/lib/pwa/register.ts              — guarded SW registration wrapper
src/lib/db/idb.ts                    — IndexedDB schema + helpers (catalog, projects, meta stores)
src/lib/excel/parse.ts               — SheetJS parse + column validation/mapping
src/lib/pricing/tiers.ts             — tier bracket logic + column resolver
src/lib/pricing/types.ts             — Article, Project, PriceListColumn types
src/components/pricing/UploadCard.tsx
src/components/pricing/DisclaimerBanner.tsx
src/components/pricing/ProjectForm.tsx
src/components/pricing/ResultBadge.tsx
src/components/pricing/ArticleLookup.tsx
src/components/pricing/HistoryTable.tsx
vite.config.ts                       — add VitePWA plugin
```

## 3. Data Model

```ts
type PriceListKey =
  | "A - Liste" | "B - Liste" | "C - Liste"
  | "D - Liste bzw. Großdepot Mind. Preis"
  | "E - Liste bzw. Depot Mind. Preis"
  | "F - Liste (Handelspreisliste)"
  | "Standardpreisliste";

type Article = {
  artikel_nr: string;
  bezeichnung_1: string;
  bezeichnung_2?: string;
  verpackungseinheit?: string;
  vpe?: string | number;
  palettenmenge?: string | number;
  me?: string;
  prices: Record<PriceListKey, number | null>;
};

type Project = {
  id: string;            // uuid
  createdAt: number;
  kundenname: string;
  kundenkategorie: "Fachhandel" | "Bedacher" | "Architekt" | "GaLaBau" | "Sonstige";
  kundenart: string;     // dropdown values TBD by user — sensible defaults provided
  klassifizierung: "A" | "B" | "C" | "D";
  dachgroesse_m2: number;
  aufbaupreis_eur_m2: number;
  projektwert: number;          // computed
  tier: "A" | "B" | "C" | "D" | "E" | "F";
  priceListColumn: PriceListKey;
};
```

IndexedDB (db `zinco-pwa`, v1) stores: `articles` (keyPath `artikel_nr`), `projects` (keyPath `id`), `meta` (kv).

## 4. Excel Import Flow

1. User picks `.xlsx`/`.xls`; parsed with `XLSX.read` → first sheet → `sheet_to_json({ defval: null })`.
2. Validate headers against the exact 14 required column names. Missing/extra headers → show explicit error listing them.
3. Coerce price cells to `number | null` (handle commas, blanks). Build `Article[]` and bulk-write to IndexedDB, replacing prior catalog.
4. Toast success with row count + save `meta.lastImport = { filename, importedAt, rows }`.

## 5. Pricing Logic

```ts
function resolveTier(projektwert: number) {
  if (projektwert <= 5000)   return { tier: "F", col: "F - Liste (Handelspreisliste)" };
  if (projektwert <= 10000)  return { tier: "E", col: "E - Liste bzw. Depot Mind. Preis" };
  if (projektwert <= 25000)  return { tier: "D", col: "D - Liste bzw. Großdepot Mind. Preis" };
  if (projektwert <= 50000)  return { tier: "C", col: "C - Liste" };
  if (projektwert <= 100000) return { tier: "B", col: "B - Liste" };
  return { tier: "A", col: "A - Liste" };
}
```

Result rendered as a prominent shadcn `Badge`: **"Zugeordnete Objektkondition: Preisliste F"** etc.

## 6. UI Sections (single page, top → bottom)

1. **Header** — app title, ZinCo subtitle, import status chip ("Katalog: 1.234 Artikel, importiert am …" or "Kein Katalog geladen").
2. **Excel Upload Card** — drag/drop + file picker, header validation feedback.
3. **Disclaimer Banner** — yellow `Alert`, fixed text from spec, shown above pricing inputs.
4. **Projekt-Eingabe form** — Kundenname, Kundenkategorie, Kundenart, Kunden-Klassifizierung, Dachgröße (m²), Aufbaupreis €/m². Live computation of Projektwert + tier badge as fields change.
5. **Ergebnis** — success badge with tier letter, also showing computed Projektwert in EUR.
6. **Artikel-Sandbox** — search input (debounced) over `artikel_nr` + `bezeichnung_1`/`_2`; results table shows VPE, ME, and the price from the **currently determined** column. If no project values yet → show all price columns instead.
7. **Projekt speichern** button — persists to IndexedDB, toast confirmation.
8. **Historie** — sortable/filterable table of saved projects; per-row delete, **CSV exportieren** button (semicolon-separated for DE Excel, UTF-8 BOM).

## 7. PWA / Offline

- `vite-plugin-pwa` config: `injectRegister: null`, `devOptions: { enabled: false }`, `registerType: "autoUpdate"`, NetworkFirst for navigations, CacheFirst for hashed assets, exclude `/~oauth`.
- `src/lib/pwa/register.ts` only registers when `import.meta.env.PROD`, not in iframe, hostname not preview/lovableproject/lovableproject-dev/beta.lovable.dev, and URL lacks `?sw=off`. Otherwise unregisters any existing `/sw.js`.
- Manifest + icons + theme-color meta wired in `__root.tsx`.

## 8. Quality Bar

- All copy in German per spec; UI labels match exactly where quoted.
- Touch-friendly: min 44px tap targets, large inputs, single-column layout below `md`.
- No network calls anywhere in the app code path.
- Number parsing tolerates `1.234,56` and `1234.56` for pasted Excel values.

## 9. Out of Scope (will not build unless asked)

- User auth / multi-device sync.
- Server-side Excel storage.
- Editing the imported catalog inline.

After approval I'll implement everything above in one pass, install `xlsx`, `idb`, and `vite-plugin-pwa`, and verify the build.
