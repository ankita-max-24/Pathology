import { describe, expect, it } from "vitest";

import {
  calcDiscount,
  calcSubtotal,
  closingStock,
  computeBillTotals,
  itemTotal,
  paymentStatus,
  round2,
  stockStatus,
} from "@/lib/lab/calculations";
import { createSeedDB } from "@/lib/lab/seed";
import { buildBillViews, buildPatientViews, currentStock, stockDay } from "@/lib/lab/selectors";

describe("Lab Calculations & Financial Integrity", () => {
  it("calculates item total and bill subtotal correctly", () => {
    const items = [
      { qty: 2, unitPrice: 350 }, // 700
      { qty: 1, unitPrice: 550 }, // 550
    ];
    expect(itemTotal(items[0]!)).toBe(700);
    expect(calcSubtotal(items)).toBe(1250);
  });

  it("calculates fixed and percentage discounts accurately", () => {
    expect(calcDiscount(1000, "fixed", 150)).toBe(150);
    expect(calcDiscount(1000, "percent", 10)).toBe(100);
    expect(calcDiscount(1250, "percent", 15)).toBe(187.5);
  });

  it("computes full bill totals with additional charges and payment", () => {
    const res = computeBillTotals({
      items: [{ qty: 1, unitPrice: 600 }, { qty: 1, unitPrice: 400 }],
      discountType: "fixed",
      discountValue: 100,
      additionalCharges: 50,
      amountPaid: 950,
    });

    expect(res.subtotal).toBe(1000);
    expect(res.discount).toBe(100);
    expect(res.additionalCharges).toBe(50);
    expect(res.total).toBe(950);
    expect(res.paid).toBe(950);
    expect(res.pending).toBe(0);
    expect(res.status).toBe("Paid");
  });

  it("identifies partial payment and pending payment status", () => {
    expect(paymentStatus(1000, 1000)).toBe("Paid");
    expect(paymentStatus(1000, 500)).toBe("Partially Paid");
    expect(paymentStatus(1000, 0)).toBe("Pending");
  });

  it("calculates closing stock and stock threshold status", () => {
    expect(closingStock(10, 5, 3)).toBe(12);
    expect(stockStatus(10, 5)).toBe("In Stock");
    expect(stockStatus(5, 5)).toBe("Low Stock");
    expect(stockStatus(0, 5)).toBe("Out of Stock");
    expect(stockStatus(-1, 5)).toBe("Out of Stock");
  });

  it("verifies seed database consistency and selectors", () => {
    const db = createSeedDB();
    expect(db.patients.length).toBeGreaterThan(0);
    expect(db.tests.length).toBeGreaterThan(0);
    expect(db.bills.length).toBeGreaterThan(0);
    expect(db.products.length).toBe(7);

    const billViews = buildBillViews(db);
    expect(billViews.length).toBe(db.bills.length);
    for (const b of billViews) {
      expect(b.paid).toBeGreaterThanOrEqual(0);
      expect(b.pending).toBeGreaterThanOrEqual(0);
      expect(round2(b.paid + b.pending)).toBe(round2(b.total));
    }

    const patientViews = buildPatientViews(db, billViews);
    expect(patientViews.length).toBe(db.patients.length);

    // Stock for product 1
    const p1 = db.products[0]!;
    const p1Stock = currentStock(db, p1.id);
    expect(typeof p1Stock).toBe("number");
  });
});
