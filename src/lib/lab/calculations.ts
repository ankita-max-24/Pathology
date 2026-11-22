import type { BillItem, DiscountType, PaymentStatus, StockStatus } from "./types";

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function itemTotal(item: Pick<BillItem, "qty" | "unitPrice">) {
  return round2(item.qty * item.unitPrice);
}

export function calcSubtotal(items: Pick<BillItem, "qty" | "unitPrice">[]) {
  return round2(items.reduce((sum, i) => sum + itemTotal(i), 0));
}

export function calcDiscount(subtotal: number, type: DiscountType, value: number) {
  const v = Number.isFinite(value) && value > 0 ? value : 0;
  return round2(type === "percent" ? (subtotal * v) / 100 : v);
}

export function paymentStatus(total: number, paid: number): PaymentStatus {
  if (paid >= total) return "Paid";
  if (paid > 0) return "Partially Paid";
  return "Pending";
}

export interface BillTotalsInput {
  items: Pick<BillItem, "qty" | "unitPrice">[];
  discountType: DiscountType;
  discountValue: number;
  additionalCharges: number;
  amountPaid: number;
}

export interface BillTotals {
  subtotal: number;
  discount: number;
  additionalCharges: number;
  total: number;
  paid: number;
  pending: number;
  status: PaymentStatus;
  errors: { discount?: string; paid?: string };
}

/** Final = Subtotal − Discount + Additional charges; Pending = Final − Paid. */
export function computeBillTotals(input: BillTotalsInput): BillTotals {
  const subtotal = calcSubtotal(input.items);
  const discount = calcDiscount(subtotal, input.discountType, input.discountValue);
  const additionalCharges = round2(Math.max(0, input.additionalCharges || 0));
  const total = round2(Math.max(0, subtotal - discount + additionalCharges));
  const paid = round2(Math.max(0, input.amountPaid || 0));
  const pending = round2(Math.max(0, total - paid));
  const errors: BillTotals["errors"] = {};
  if (discount > subtotal) errors.discount = "Discount cannot exceed the subtotal";
  if (input.discountType === "percent" && input.discountValue > 100)
    errors.discount = "Percentage cannot exceed 100%";
  if (paid > total) errors.paid = "Amount paid cannot exceed the final amount";
  return {
    subtotal,
    discount,
    additionalCharges,
    total,
    paid,
    pending,
    status: paymentStatus(total, paid),
    errors,
  };
}

export function closingStock(opening: number, purchase: number, sale: number) {
  return opening + purchase - sale;
}

export function stockStatus(qty: number, minStock: number): StockStatus {
  if (qty <= 0) return "Out of Stock";
  if (qty <= minStock) return "Low Stock";
  return "In Stock";
}

export function ageFromDob(dob: string, today = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime()) || d > today) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}

export const isValidMobile = (m: string) => /^[6-9]\d{9}$/.test(m.replace(/\s/g, ""));
