import { closingStock, paymentStatus, round2, stockStatus } from "./calculations";
import { addDays, toDateKey } from "./format";
import type { Bill, LabDB, Patient, Payment, PaymentMode, PaymentStatus, StockStatus, StockTxn } from "./types";

export interface BillView extends Bill {
  patient: Patient | undefined;
  patientName: string;
  dateKey: string;
  paid: number;
  pending: number;
  status: PaymentStatus;
  payments: Payment[];
  modes: PaymentMode[];
  testCount: number;
}

export function buildBillViews(db: LabDB): BillView[] {
  const paysByBill = new Map<string, Payment[]>();
  for (const p of db.payments) {
    const list = paysByBill.get(p.billId) ?? [];
    list.push(p);
    paysByBill.set(p.billId, list);
  }
  const patients = new Map(db.patients.map((p) => [p.id, p]));
  return db.bills
    .map((b) => {
      const pays = (paysByBill.get(b.id) ?? []).sort((a, c) => a.date.localeCompare(c.date));
      const paid = round2(pays.reduce((s, p) => s + p.amount, 0));
      const patient = patients.get(b.patientId);
      return {
        ...b,
        patient,
        patientName: patient?.name ?? "Unknown",
        dateKey: toDateKey(b.createdAt),
        paid,
        pending: round2(Math.max(0, b.total - paid)),
        status: paymentStatus(b.total, paid),
        payments: pays,
        modes: [...new Set(pays.map((p) => p.mode))],
        testCount: b.items.reduce((s, i) => s + i.qty, 0),
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface PatientView extends Patient {
  visits: number;
  totalTests: number;
  billed: number;
  paid: number;
  outstanding: number;
  lastVisit: string; // ISO or ""
  registeredKey: string;
}

export function buildPatientViews(db: LabDB, bills: BillView[]): PatientView[] {
  const byPatient = new Map<string, BillView[]>();
  for (const b of bills) {
    const list = byPatient.get(b.patientId) ?? [];
    list.push(b);
    byPatient.set(b.patientId, list);
  }
  return db.patients
    .map((p) => {
      const list = byPatient.get(p.id) ?? [];
      const days = new Set(list.map((b) => b.dateKey));
      return {
        ...p,
        visits: days.size,
        totalTests: list.reduce((s, b) => s + b.testCount, 0),
        billed: round2(list.reduce((s, b) => s + b.total, 0)),
        paid: round2(list.reduce((s, b) => s + b.paid, 0)),
        outstanding: round2(list.reduce((s, b) => s + b.pending, 0)),
        lastVisit: list[0]?.createdAt ?? "",
        registeredKey: toDateKey(p.createdAt),
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** Signed effect of a transaction on stock on hand. */
export function txnEffect(t: StockTxn): number {
  switch (t.type) {
    case "Opening":
    case "Purchase":
      return t.qty;
    case "Sale":
    case "Usage":
      return -t.qty;
    case "Adjustment":
      return t.qty;
  }
}

export interface StockDayRow {
  date: string;
  productId: string;
  productName: string;
  minStock: number;
  opening: number;
  purchase: number;
  sale: number;
  closing: number;
  status: StockStatus;
}

/**
 * Daily register row. Opening = everything before the date (plus Opening entries on the date).
 * Purchase/Sale columns sum that day's purchases and sales+usage; adjustments fold into opening.
 */
export function stockDay(db: LabDB, productId: string, date: string): StockDayRow {
  const product = db.products.find((p) => p.id === productId);
  let opening = 0;
  let purchase = 0;
  let sale = 0;
  for (const t of db.stockTxns) {
    if (t.productId !== productId || t.date > date) continue;
    if (t.date < date) opening += txnEffect(t);
    else if (t.type === "Opening" || t.type === "Adjustment") opening += txnEffect(t);
    else if (t.type === "Purchase") purchase += t.qty;
    else sale += t.qty;
  }
  const closing = closingStock(opening, purchase, sale);
  return {
    date,
    productId,
    productName: product?.name ?? productId,
    minStock: product?.minStock ?? 0,
    opening,
    purchase,
    sale,
    closing,
    status: stockStatus(closing, product?.minStock ?? 0),
  };
}

export function stockRegister(db: LabDB, date: string): StockDayRow[] {
  return db.products.map((p) => stockDay(db, p.id, date));
}

export function stockRange(db: LabDB, from: string, to: string, productId?: string): StockDayRow[] {
  const rows: StockDayRow[] = [];
  const products = productId ? db.products.filter((p) => p.id === productId) : db.products;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const p of products) rows.push(stockDay(db, p.id, d));
  }
  return rows;
}

export function currentStock(db: LabDB, productId: string): number {
  return db.stockTxns.filter((t) => t.productId === productId).reduce((s, t) => s + txnEffect(t), 0);
}

/** Minimum on-hand balance from `date` onward if a change of `delta` were applied on `date`. */
export function minBalanceFrom(db: LabDB, productId: string, date: string, delta: number): number {
  const txns = db.stockTxns
    .filter((t) => t.productId === productId)
    .sort((a, b) => a.date.localeCompare(b.date));
  let bal = 0;
  let min = Number.POSITIVE_INFINITY;
  let applied = false;
  const dates = [...new Set([...txns.map((t) => t.date), date])].sort();
  for (const d of dates) {
    for (const t of txns) if (t.date === d) bal += txnEffect(t);
    if (d === date && !applied) {
      bal += delta;
      applied = true;
    }
    if (d >= date) min = Math.min(min, bal);
  }
  return min === Number.POSITIVE_INFINITY ? bal : min;
}

export function inRange(key: string, from: string, to: string) {
  return key >= from && key <= to;
}
