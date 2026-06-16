import type { PriceListKey } from "./types";

export type CartItem = {
  artikel_nr: string;
  bezeichnung_1: string;
  bezeichnung_2: string;
  me: string;
  priceColumn: PriceListKey;
  unitPrice: number;
  quantity: number;
};

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
