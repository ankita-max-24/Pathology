export type Gender = "Male" | "Female" | "Other";

export interface Patient {
  id: string;
  name: string;
  dob: string; // YYYY-MM-DD or ""
  age: number;
  gender: Gender;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  referringDoctor: string;
  notes: string;
  createdAt: string; // ISO
}

export const TEST_CATEGORIES = [
  "Hematology",
  "Biochemistry",
  "Hormones",
  "Thyroid",
  "Diabetes",
  "Immunology",
  "Urine",
  "Other",
] as const;
export type TestCategory = (typeof TEST_CATEGORIES)[number];

export interface LabTest {
  id: string;
  name: string;
  category: TestCategory;
  price: number;
  active: boolean;
}

export interface BillItem {
  testId: string;
  name: string;
  category: TestCategory;
  qty: number;
  unitPrice: number; // snapshot at billing time
}

export type DiscountType = "fixed" | "percent";

export interface Bill {
  id: string;
  patientId: string;
  createdAt: string; // ISO
  items: BillItem[];
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  additionalCharges: number;
  additionalDesc: string;
  subtotal: number;
  total: number;
}

export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Other"] as const;
export type PaymentMode = (typeof PAYMENT_MODES)[number];

export interface Payment {
  id: string;
  billId: string;
  patientId: string;
  date: string; // ISO
  amount: number;
  mode: PaymentMode;
  reference: string;
}

export type PaymentStatus = "Paid" | "Partially Paid" | "Pending";

export interface StockProduct {
  id: string;
  name: string;
  minStock: number;
  unit: string;
}

export const STOCK_TXN_TYPES = ["Opening", "Purchase", "Sale", "Usage", "Adjustment"] as const;
export type StockTxnType = (typeof STOCK_TXN_TYPES)[number];

export interface StockTxn {
  id: string;
  productId: string;
  date: string; // YYYY-MM-DD
  type: StockTxnType;
  /** Units. Positive for Opening/Purchase/Sale/Usage (direction comes from type); signed for Adjustment. Register edits may be negative corrections. */
  qty: number;
  amount: number;
  reference: string;
  notes: string;
  supplier: string;
  patientId: string;
  createdAt: string;
}

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export type UserRole = "Administrator" | "Receptionist" | "Billing Staff" | "Laboratory Staff";
export const USER_ROLES: UserRole[] = [
  "Administrator",
  "Receptionist",
  "Billing Staff",
  "Laboratory Staff",
];

export interface AppUser {
  id: string;
  name: string;
  userId: string;
  role: UserRole;
  active: boolean;
}

export interface LabSettings {
  labName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  phone: string;
  email: string;
  registrationNo: string;
  gstin: string;
  receiptFooter: string;
  showReferringDoctor: boolean;
  allowPriceEdit: boolean;
  allowDuplicateTests: boolean;
  defaultPaymentMode: PaymentMode;
  defaultMinStock: number;
}

export interface LabDB {
  version: number;
  patients: Patient[];
  tests: LabTest[];
  bills: Bill[];
  payments: Payment[];
  products: StockProduct[];
  stockTxns: StockTxn[];
  users: AppUser[];
  settings: LabSettings;
}
