import type { TierResult } from "./types";

export function resolveTier(projektwert: number): TierResult {
  if (!Number.isFinite(projektwert) || projektwert < 0) {
    return {
      tier: "F",
      column: "F - Liste (Handelspreisliste)",
      label: "Preisliste F",
    };
  }
  if (projektwert <= 5000)
    return { tier: "F", column: "F - Liste (Handelspreisliste)", label: "Preisliste F" };
  if (projektwert <= 10000)
    return { tier: "E", column: "E - Liste bzw. Depot Mind. Preis", label: "Preisliste E" };
  if (projektwert <= 25000)
    return { tier: "D", column: "D - Liste bzw. Großdepot Mind. Preis", label: "Preisliste D" };
  if (projektwert <= 50000)
    return { tier: "C", column: "C - Liste", label: "Preisliste C" };
  if (projektwert <= 100000)
    return { tier: "B", column: "B - Liste", label: "Preisliste B" };
  return { tier: "A", column: "A - Liste", label: "Preisliste A" };
}

export function formatEUR(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("de-DE").format(value);
}
