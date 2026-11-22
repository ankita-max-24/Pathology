import { calcDiscount, calcSubtotal, round2 } from "./calculations";
import { addDays, toDateKey } from "./format";
import type {
  AppUser,
  Bill,
  BillItem,
  LabDB,
  LabSettings,
  LabTest,
  Patient,
  Payment,
  PaymentMode,
  StockProduct,
  StockTxn,
} from "./types";

export const DB_VERSION = 1;

export const SEED_TESTS: LabTest[] = (
  [
    ["Free T4 (s)", "Thyroid", 450],
    ["Free Testosterone", "Hormones", 1200],
    ["FSH (s)", "Hormones", 550],
    ["Gamma GT (GGT)", "Biochemistry", 300],
    ["Glucose (F)", "Diabetes", 80],
    ["Glucose (F+PP)", "Diabetes", 150],
    ["Glucose (PP)", "Diabetes", 80],
    ["Glucose (Random)", "Diabetes", 100],
    ["Glucose Challenge Test", "Diabetes", 250],
    ["CBC", "Hematology", 350],
    ["HbA1c", "Diabetes", 550],
    ["Lipid Profile", "Biochemistry", 600],
    ["LFT", "Biochemistry", 650],
    ["KFT", "Biochemistry", 600],
    ["TSH", "Thyroid", 300],
    ["Vitamin D", "Biochemistry", 1400],
    ["Vitamin B12", "Biochemistry", 1000],
    ["Urine Routine", "Urine", 150],
    ["ESR", "Hematology", 120],
    ["CRP", "Immunology", 450],
  ] as const
).map(([name, category, price], i) => ({
  id: `TST-${String(i + 1).padStart(3, "0")}`,
  name,
  category,
  price,
  active: true,
}));

export const SEED_PRODUCTS: StockProduct[] = [
  { id: "PRD-01", name: "FSH", minStock: 5, unit: "vial" },
  { id: "PRD-02", name: "HCG 10000 IU", minStock: 5, unit: "vial" },
  { id: "PRD-03", name: "HCG 5000 IU", minStock: 5, unit: "vial" },
  { id: "PRD-04", name: "Rubella", minStock: 4, unit: "dose" },
  { id: "PRD-05", name: "Cervavac", minStock: 3, unit: "dose" },
  { id: "PRD-06", name: "Boostrix", minStock: 3, unit: "dose" },
  { id: "PRD-07", name: "Influenza", minStock: 4, unit: "dose" },
];

const PRODUCT_PRICES: Record<string, [number, number]> = {
  "PRD-01": [1250, 1500],
  "PRD-02": [900, 1100],
  "PRD-03": [550, 700],
  "PRD-04": [650, 850],
  "PRD-05": [1800, 2000],
  "PRD-06": [1400, 1700],
  "PRD-07": [1500, 1800],
};

export const DEFAULT_SETTINGS: LabSettings = {
  labName: "GNS Pathology Lab",
  tagline: "Diagnostic & Pathology Services",
  address: "14, Civil Lines, Station Road",
  city: "Raipur",
  state: "Chhattisgarh",
  pin: "492001",
  phone: "+91 771 400 2210",
  email: "care@gnspathlab.in",
  registrationNo: "CG/CE/2019/0482",
  gstin: "22AABCG1234F1Z5",
  receiptFooter: "Thank you for choosing our laboratory.",
  showReferringDoctor: true,
  allowPriceEdit: true,
  allowDuplicateTests: false,
  defaultPaymentMode: "Cash",
  defaultMinStock: 5,
};

const SEED_USERS: AppUser[] = [
  { id: "USR-01", name: "Dr. Nidhi Gupta", userId: "nidhi.admin", role: "Administrator", active: true },
  { id: "USR-02", name: "Anjali Tiwari", userId: "anjali.front", role: "Receptionist", active: true },
  { id: "USR-03", name: "Manoj Yadav", userId: "manoj.billing", role: "Billing Staff", active: true },
  { id: "USR-04", name: "Suresh Dewangan", userId: "suresh.lab", role: "Laboratory Staff", active: true },
  { id: "USR-05", name: "Kavita Nair", userId: "kavita.lab", role: "Laboratory Staff", active: false },
];

// Deterministic PRNG so the demo data is stable for a given anchor date.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PATIENT_SEED: [string, number, Patient["gender"], string, number, string][] = [
  ["Rahul Sharma", 42, "Male", "9826012345", -58, "Dr. A. K. Mishra"],
  ["Priya Verma", 29, "Female", "9893045678", -51, "Dr. S. Agrawal"],
  ["Amit Kumar", 35, "Male", "9755123456", -44, ""],
  ["Sneha Patel", 31, "Female", "9827098765", -37, "Dr. R. Jain"],
  ["Rakesh Singh", 56, "Male", "9406234567", -30, "Dr. A. K. Mishra"],
  ["Neha Gupta", 26, "Female", "9584345678", -24, ""],
  ["Pooja Sahu", 33, "Female", "9301456789", -18, "Dr. S. Agrawal"],
  ["Vikas Chandrakar", 47, "Male", "9179567890", -14, ""],
  ["Meena Dewangan", 61, "Female", "9425678901", -9, "Dr. R. Jain"],
  ["Arjun Tiwari", 22, "Male", "9630789012", -5, ""],
  ["Kavya Joshi", 38, "Female", "9098890123", -2, "Dr. P. Banerjee"],
  ["Sanjay Verma", 51, "Male", "9893901234", 0, ""],
];

function isoAt(key: string, hour: number, minute: number) {
  const d = new Date(key + "T00:00:00");
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function createSeedDB(now = new Date()): LabDB {
  const today = toDateKey(now);
  const rand = mulberry32(20261121);
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)] as T;
  const year = now.getFullYear();

  const patients: Patient[] = PATIENT_SEED.map(([name, age, gender, mobile, day, doc], i) => {
    const regKey = addDays(today, day);
    const birthYear = year - age;
    return {
      id: `PAT-${String(i + 1).padStart(4, "0")}`,
      name,
      dob: i % 3 === 2 ? "" : `${birthYear}-${String((i % 12) + 1).padStart(2, "0")}-${String((i * 3) % 27 + 1).padStart(2, "0")}`,
      age,
      gender,
      mobile,
      address: `${(i + 3) * 7}, ${pick(["Shankar Nagar", "Pandri", "Telibandha", "Samta Colony", "Avanti Vihar", "Devendra Nagar"])}`,
      city: "Raipur",
      state: "Chhattisgarh",
      pin: pick(["492001", "492004", "492007", "492006"]),
      referringDoctor: doc,
      notes: "",
      createdAt: isoAt(regKey, 9 + (i % 8), (i * 13) % 60),
    };
  });

  const tests = SEED_TESTS.map((t) => ({ ...t }));
  const bills: Bill[] = [];
  const payments: Payment[] = [];
  let billSeq = 0;
  let paySeq = 0;
  const modes: PaymentMode[] = ["Cash", "Cash", "UPI", "UPI", "UPI", "Card", "Other"];

  const addPayment = (bill: Bill, amount: number, iso: string, mode: PaymentMode) => {
    paySeq++;
    payments.push({
      id: `PAY-${String(paySeq).padStart(4, "0")}`,
      billId: bill.id,
      patientId: bill.patientId,
      date: iso,
      amount: round2(amount),
      mode,
      reference: mode === "UPI" ? `UPI${Math.floor(rand() * 1e9)}` : mode === "Card" ? `TXN${Math.floor(rand() * 1e6)}` : "",
    });
  };

  const followUps: { bill: Bill; amount: number; dayOffset: number }[] = [];

  for (let d = -20; d <= 0; d++) {
    const key = addDays(today, d);
    const count = d === 0 ? 4 : 1 + Math.floor(rand() * 3);
    const eligible = patients.filter((p) => toDateKey(p.createdAt) <= key);
    let hour = 8;
    for (let b = 0; b < count; b++) {
      // Make sure every patient's first bill is on their registration day when possible.
      const fresh = eligible.find((p) => toDateKey(p.createdAt) === key && !bills.some((x) => x.patientId === p.id));
      const patient = fresh ?? pick(eligible);
      if (!patient) continue;
      const nItems = 1 + Math.floor(rand() * 3);
      const chosen = new Set<string>();
      while (chosen.size < nItems) chosen.add(pick(tests).id);
      const items: BillItem[] = [...chosen].map((id) => {
        const t = tests.find((x) => x.id === id)!;
        return { testId: t.id, name: t.name, category: t.category, qty: 1, unitPrice: t.price };
      });
      const subtotal = calcSubtotal(items);
      const r = rand();
      const discountType = r < 0.15 ? "percent" : "fixed";
      const discountValue = r < 0.15 ? 10 : r < 0.3 ? 50 : 0;
      const discountAmount = calcDiscount(subtotal, discountType, discountValue);
      const additionalCharges = rand() < 0.15 ? 50 : 0;
      const total = round2(subtotal - discountAmount + additionalCharges);
      hour += 1 + Math.floor(rand() * 2);
      const createdAt = isoAt(key, Math.min(hour, 19), Math.floor(rand() * 60));
      billSeq++;
      const bill: Bill = {
        id: `LAB-${year}-${String(billSeq).padStart(4, "0")}`,
        patientId: patient.id,
        createdAt,
        items,
        discountType,
        discountValue,
        discountAmount,
        additionalCharges,
        additionalDesc: additionalCharges ? "Home collection" : "",
        subtotal,
        total,
      };
      bills.push(bill);
      const pr = rand();
      const mode = pick(modes);
      if (pr < 0.68) addPayment(bill, total, createdAt, mode);
      else if (pr < 0.9) {
        const part = Math.round((total * 0.5) / 10) * 10;
        addPayment(bill, part, createdAt, mode);
        if (d < -3 && rand() < 0.5) followUps.push({ bill, amount: total - part, dayOffset: d + 2 });
      }
      // else: pending, no payment
    }
  }
  for (const f of followUps) {
    addPayment(f.bill, f.amount, isoAt(addDays(today, f.dayOffset), 11, 15), pick(["Cash", "UPI"]));
  }
  payments.sort((a, b) => a.date.localeCompare(b.date));
  payments.forEach((p, i) => (p.id = `PAY-${String(i + 1).padStart(4, "0")}`));

  // Stock register
  const stockTxns: StockTxn[] = [];
  let stkSeq = 0;
  const pushTxn = (t: Omit<StockTxn, "id" | "createdAt" | "supplier" | "patientId" | "notes" | "reference"> & Partial<StockTxn>) => {
    stkSeq++;
    stockTxns.push({
      id: `STK-${String(stkSeq).padStart(4, "0")}`,
      reference: "",
      notes: "",
      supplier: "",
      patientId: "",
      createdAt: isoAt(t.date, 10, 0),
      ...t,
    });
  };
  const openings: Record<string, number> = {
    "PRD-01": 18, "PRD-02": 14, "PRD-03": 16, "PRD-04": 10, "PRD-05": 8, "PRD-06": 9, "PRD-07": 7,
  };
  const startKey = addDays(today, -20);
  for (const p of SEED_PRODUCTS) {
    const open = openings[p.id] ?? 10;
    const [buy, sell] = PRODUCT_PRICES[p.id] ?? [0, 0];
    pushTxn({ productId: p.id, date: startKey, type: "Opening", qty: open, amount: open * buy, notes: "Opening stock" });
    let onHand = open;
    for (let d = -19; d <= 0; d++) {
      const key = addDays(today, d);
      if (p.id !== "PRD-07" && p.id !== "PRD-04" && (d === -12 || d === -4) && rand() < 0.8) {
        const q = 5 + Math.floor(rand() * 6);
        onHand += q;
        pushTxn({
          productId: p.id, date: key, type: "Purchase", qty: q, amount: q * buy,
          supplier: pick(["Medplus Distributors", "Shree Pharma Agency", "Raipur Medical Traders"]),
          reference: `INV-${4100 + stkSeq}`,
        });
      }
      if (rand() < 0.35 && onHand > 0) {
        const q = Math.min(onHand, 1 + Math.floor(rand() * 2));
        onHand -= q;
        const usage = rand() < 0.2;
        pushTxn({
          productId: p.id, date: key, type: usage ? "Usage" : "Sale", qty: q, amount: usage ? 0 : q * sell,
          patientId: pick(patients).id,
        });
      }
    }
    // Shape the demo: Influenza runs out, Rubella sits at low stock.
    if (p.id === "PRD-07" && onHand > 0) {
      pushTxn({ productId: p.id, date: today, type: "Sale", qty: onHand, amount: onHand * sell, patientId: "PAT-0009" });
    }
    if (p.id === "PRD-04" && onHand > 3) {
      const q = onHand - 3;
      pushTxn({ productId: p.id, date: today, type: "Sale", qty: q, amount: q * sell, patientId: "PAT-0004" });
    }
  }

  return {
    version: DB_VERSION,
    patients,
    tests,
    bills,
    payments,
    products: SEED_PRODUCTS.map((p) => ({ ...p })),
    stockTxns,
    users: SEED_USERS.map((u) => ({ ...u })),
    settings: { ...DEFAULT_SETTINGS },
  };
}
