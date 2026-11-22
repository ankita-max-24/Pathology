import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { computeBillTotals, round2 } from "./calculations";
import { toDateKey } from "./format";
import { nextBillId, nextId } from "./ids";
import { createSeedDB, DB_VERSION } from "./seed";
import { buildBillViews, buildPatientViews, type BillView, type PatientView } from "./selectors";
import type {
  AppUser,
  Bill,
  BillItem,
  DiscountType,
  LabDB,
  LabSettings,
  LabTest,
  Patient,
  Payment,
  PaymentMode,
  StockProduct,
  StockTxn,
} from "./types";

const STORAGE_KEY = "gns-pathlab-db";

export type PatientInput = Omit<Patient, "id" | "createdAt">;
export type TestInput = Omit<LabTest, "id">;
export type UserInput = Omit<AppUser, "id">;

export interface CreateBillInput {
  patientId: string;
  items: BillItem[];
  discountType: DiscountType;
  discountValue: number;
  additionalCharges: number;
  additionalDesc: string;
  payment: { amount: number; mode: PaymentMode; date: string; reference: string } | null;
}

export interface PaymentInput {
  billId: string;
  amount: number;
  mode: PaymentMode;
  date: string; // ISO
  reference: string;
}

export type StockTxnInput = Omit<StockTxn, "id" | "createdAt">;

interface LabStore {
  db: LabDB;
  bills: BillView[];
  patients: PatientView[];
  addPatient: (input: PatientInput) => Patient;
  updatePatient: (id: string, input: PatientInput) => void;
  addTest: (input: TestInput) => LabTest;
  updateTest: (id: string, input: TestInput) => void;
  createBill: (input: CreateBillInput) => Bill;
  addPayment: (input: PaymentInput) => Payment;
  addStockTxn: (input: StockTxnInput) => StockTxn;
  setRegisterValue: (date: string, productId: string, field: "purchase" | "sale", value: number) => void;
  updateProduct: (id: string, patch: Partial<Omit<StockProduct, "id">>) => void;
  updateSettings: (patch: Partial<LabSettings>) => void;
  addUser: (input: UserInput) => void;
  updateUser: (id: string, input: UserInput) => void;
  resetDemoData: () => void;
}

const Ctx = createContext<LabStore | null>(null);

function loadDB(): LabDB {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LabDB;
      if (parsed.version === DB_VERSION) return parsed;
    }
  } catch {
    /* fall through to seed */
  }
  return createSeedDB();
}

export function LabStoreProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [db, setDb] = useState<LabDB | null>(null);
  // Latest snapshot for actions that must return the created record synchronously.
  const ref = useRef<LabDB | null>(null);

  useEffect(() => {
    const loaded = loadDB();
    ref.current = loaded;
    setDb(loaded);
  }, []);

  useEffect(() => {
    if (db) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }, [db]);

  const commit = useCallback((next: LabDB) => {
    ref.current = next;
    setDb(next);
  }, []);
  const cur = () => ref.current as LabDB;

  const addPatient = useCallback((input: PatientInput) => {
    const d = cur();
    const patient: Patient = { ...input, id: nextId(d.patients.map((p) => p.id), "PAT-"), createdAt: new Date().toISOString() };
    commit({ ...d, patients: [...d.patients, patient] });
    return patient;
  }, [commit]);

  const updatePatient = useCallback((id: string, input: PatientInput) => {
    const d = cur();
    commit({ ...d, patients: d.patients.map((p) => (p.id === id ? { ...p, ...input } : p)) });
  }, [commit]);

  const addTest = useCallback((input: TestInput) => {
    const d = cur();
    const test: LabTest = { ...input, id: nextId(d.tests.map((t) => t.id), "TST-", 3) };
    commit({ ...d, tests: [...d.tests, test] });
    return test;
  }, [commit]);

  const updateTest = useCallback((id: string, input: TestInput) => {
    const d = cur();
    commit({ ...d, tests: d.tests.map((t) => (t.id === id ? { ...t, ...input } : t)) });
  }, [commit]);

  const createBill = useCallback((input: CreateBillInput) => {
    const d = cur();
    const totals = computeBillTotals({
      items: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      additionalCharges: input.additionalCharges,
      amountPaid: input.payment?.amount ?? 0,
    });
    const now = new Date();
    const bill: Bill = {
      id: nextBillId(d.bills.map((b) => b.id), now.getFullYear()),
      patientId: input.patientId,
      createdAt: now.toISOString(),
      items: input.items.map((i) => ({ ...i })),
      discountType: input.discountType,
      discountValue: input.discountValue,
      discountAmount: totals.discount,
      additionalCharges: totals.additionalCharges,
      additionalDesc: input.additionalDesc,
      subtotal: totals.subtotal,
      total: totals.total,
    };
    let payments = d.payments;
    if (input.payment && input.payment.amount > 0) {
      payments = [
        ...payments,
        {
          id: nextId(d.payments.map((p) => p.id), "PAY-"),
          billId: bill.id,
          patientId: bill.patientId,
          date: input.payment.date,
          amount: round2(Math.min(input.payment.amount, bill.total)),
          mode: input.payment.mode,
          reference: input.payment.reference,
        },
      ];
    }
    commit({ ...d, bills: [...d.bills, bill], payments });
    return bill;
  }, [commit]);

  const addPayment = useCallback((input: PaymentInput) => {
    const d = cur();
    const bill = d.bills.find((b) => b.id === input.billId);
    if (!bill) throw new Error("Bill not found");
    const payment: Payment = {
      id: nextId(d.payments.map((p) => p.id), "PAY-"),
      billId: bill.id,
      patientId: bill.patientId,
      date: input.date,
      amount: round2(input.amount),
      mode: input.mode,
      reference: input.reference,
    };
    commit({ ...d, payments: [...d.payments, payment] });
    return payment;
  }, [commit]);

  const addStockTxn = useCallback((input: StockTxnInput) => {
    const d = cur();
    const txn: StockTxn = { ...input, id: nextId(d.stockTxns.map((t) => t.id), "STK-"), createdAt: new Date().toISOString() };
    commit({ ...d, stockTxns: [...d.stockTxns, txn] });
    return txn;
  }, [commit]);

  const setRegisterValue = useCallback((date: string, productId: string, field: "purchase" | "sale", value: number) => {
    const d = cur();
    const type = field === "purchase" ? "Purchase" : "Sale";
    const matches = (t: StockTxn) =>
      t.productId === productId && t.date === date && (field === "purchase" ? t.type === "Purchase" : t.type === "Sale" || t.type === "Usage");
    const existing = d.stockTxns.filter(matches).reduce((s, t) => s + t.qty, 0);
    const delta = value - existing;
    if (delta === 0) return;
    const txn: StockTxn = {
      id: nextId(d.stockTxns.map((t) => t.id), "STK-"),
      productId,
      date,
      type,
      qty: delta,
      amount: 0,
      reference: "REGISTER",
      notes: "Daily register correction",
      supplier: "",
      patientId: "",
      createdAt: new Date().toISOString(),
    };
    commit({ ...d, stockTxns: [...d.stockTxns, txn] });
  }, [commit]);

  const updateProduct = useCallback((id: string, patch: Partial<Omit<StockProduct, "id">>) => {
    const d = cur();
    commit({ ...d, products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }, [commit]);

  const updateSettings = useCallback((patch: Partial<LabSettings>) => {
    const d = cur();
    commit({ ...d, settings: { ...d.settings, ...patch } });
  }, [commit]);

  const addUser = useCallback((input: UserInput) => {
    const d = cur();
    commit({ ...d, users: [...d.users, { ...input, id: nextId(d.users.map((u) => u.id), "USR-", 2) }] });
  }, [commit]);

  const updateUser = useCallback((id: string, input: UserInput) => {
    const d = cur();
    commit({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, ...input } : u)) });
  }, [commit]);

  const resetDemoData = useCallback(() => commit(createSeedDB()), [commit]);

  const bills = useMemo(() => (db ? buildBillViews(db) : []), [db]);
  const patients = useMemo(() => (db ? buildPatientViews(db, bills) : []), [db, bills]);

  if (!db) return <>{fallback}</>;

  const value: LabStore = {
    db,
    bills,
    patients,
    addPatient,
    updatePatient,
    addTest,
    updateTest,
    createBill,
    addPayment,
    addStockTxn,
    setRegisterValue,
    updateProduct,
    updateSettings,
    addUser,
    updateUser,
    resetDemoData,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLab(): LabStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLab must be used inside LabStoreProvider");
  return ctx;
}

export const billDateKey = (b: Bill) => toDateKey(b.createdAt);
