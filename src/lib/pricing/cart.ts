import type { CartItem } from "@/lib/pricing/types";

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
