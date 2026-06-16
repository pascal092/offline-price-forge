import type { TierResult } from "./types";

export function resolveTier(projektwert: number): TierResult {
  if (!Number.isFinite(projektwert) || projektwert < 0) {
    return { tier: "F", column: "Preisliste F", label: "Preisliste F" };
  }
  if (projektwert <= 5000)
    return { tier: "F", column: "Preisliste F", label: "Preisliste F" };
  if (projektwert <= 10000)
    return { tier: "E", column: "Preisliste E", label: "Preisliste E" };
  if (projektwert <= 25000)
    return { tier: "D", column: "Preisliste D", label: "Preisliste D" };
  if (projektwert <= 50000)
    return { tier: "C", column: "Preisliste C", label: "Preisliste C" };
  if (projektwert <= 100000)
    return { tier: "B", column: "Preisliste B", label: "Preisliste B" };
  return { tier: "A", column: "Preisliste A", label: "Preisliste A" };
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
