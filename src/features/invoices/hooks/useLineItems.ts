import { useState } from "react";
import type { LineItem } from "../types/invoice.types";

// _price / _qty hold raw text while typing so mid-entry "25." isn't lost
export type LocalLineItem = LineItem & { _id: string; _price: string; _qty: string };

export function newLineItem(): LocalLineItem {
  return { _id: crypto.randomUUID(), _price: "", _qty: "1", description: "", price: 0, qty: 1, total: 0 };
}

/**
 * Manages the line items array for the invoice form.
 * Extracts state + mutation logic out of CreateInvoicePage.
 */
export function useLineItems(initial?: LocalLineItem[]) {
  const [lineItems, setLineItems] = useState<LocalLineItem[]>(initial ?? [newLineItem()]);

  const updateLineItem = (idx: number, field: "description" | "price" | "qty", raw: string) => {
    setLineItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };
      if (field === "description") {
        item.description = raw;
      } else if (field === "price") {
        item._price = raw;
        item.price  = parseFloat(raw) || 0;
        item.total  = item.price * item.qty;
      } else if (field === "qty") {
        item._qty = raw;
        item.qty  = parseInt(raw) || 1;
        item.total = item.price * item.qty;
      }
      next[idx] = item;
      return next;
    });
  };

  const addLineItem = () => setLineItems((prev) => [...prev, newLineItem()]);

  const removeLineItem = (idx: number) =>
    setLineItems((prev) => prev.filter((_, i) => i !== idx));

  const resetLineItems = (items: LocalLineItem[]) => setLineItems(items);

  return { lineItems, updateLineItem, addLineItem, removeLineItem, resetLineItems };
}
