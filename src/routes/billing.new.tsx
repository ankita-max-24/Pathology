import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CreditCard,
  FileCheck,
  FlaskConical,
  IndianRupee,
  Percent,
  Plus,
  Receipt,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/common/Field";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { PatientForm, validatePatient } from "@/components/patients/PatientForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { computeBillTotals } from "@/lib/lab/calculations";
import { formatINR, maskMobile } from "@/lib/lab/format";
import { useLab, type PatientInput } from "@/lib/lab/store";
import {
  PAYMENT_MODES,
  TEST_CATEGORIES,
  type BillItem,
  type DiscountType,
  type LabTest,
  type PaymentMode,
  type TestCategory,
} from "@/lib/lab/types";

export const Route = createFileRoute("/billing/new")({
  validateSearch: (s: Record<string, unknown>): { patientId?: string } =>
    typeof s["patientId"] === "string" ? { patientId: s["patientId"] } : {},
  head: () => ({
    meta: [
      { title: "New Billing Workspace — GNS Pathology Lab" },
      { name: "description", content: "Create diagnostic test invoice, apply discounts, and collect payment." },
      { property: "og:title", content: "New Billing Workspace — GNS Pathology Lab" },
      { property: "og:description", content: "Create diagnostic test invoice, apply discounts, and collect payment." },
    ],
  }),
  component: NewBillingPage,
});

function NewBillingPage() {
  const { patientId: initialPatientId } = Route.useSearch();
  const { db, patients, createBill, addPatient } = useLab();
  const navigate = useNavigate();

  // Step 1: Patient Selection
  const [selectedPatientId, setSelectedPatientId] = useState<string>(initialPatientId || "");
  const [patientSearch, setPatientSearch] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);

  // Step 2 & 3: Tests Selection
  const [testSearch, setTestSearch] = useState("");
  const [testCategory, setTestCategory] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<BillItem[]>([]);

  // Step 4: Calculations
  const [discountType, setDiscountType] = useState<DiscountType>("fixed");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [additionalDesc, setAdditionalDesc] = useState<string>("");

  // Step 5: Payment
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(db.settings.defaultPaymentMode || "Cash");
  const [paymentRef, setPaymentRef] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selected patient object
  const selectedPatient = useMemo(
    () => patients.find((p) => p.id === selectedPatientId),
    [patients, selectedPatientId],
  );

  // Filtered patients for search
  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients.slice(0, 5);
    return patients
      .filter((p) => p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.mobile.includes(q))
      .slice(0, 8);
  }, [patients, patientSearch]);

  // Active tests
  const activeTests = useMemo(() => db.tests.filter((t) => t.active), [db.tests]);

  // Filtered tests
  const filteredTests = useMemo(() => {
    const q = testSearch.trim().toLowerCase();
    return activeTests.filter((t) => {
      if (q && !t.name.toLowerCase().includes(q) && !t.id.toLowerCase().includes(q)) return false;
      if (testCategory !== "all" && t.category !== testCategory) return false;
      return true;
    });
  }, [activeTests, testSearch, testCategory]);

  // Bill Totals
  const totals = useMemo(() => {
    return computeBillTotals({
      items: selectedItems,
      discountType,
      discountValue,
      additionalCharges,
      amountPaid: paidAmount,
    });
  }, [selectedItems, discountType, discountValue, additionalCharges, paidAmount]);

  // Add a test to selection
  const handleAddTest = (test: LabTest) => {
    const exists = selectedItems.find((i) => i.testId === test.id);
    if (exists) {
      if (!db.settings.allowDuplicateTests) {
        toast.info(`${test.name} is already in the bill.`);
        return;
      }
      setSelectedItems((items) =>
        items.map((i) => (i.testId === test.id ? { ...i, qty: i.qty + 1 } : i)),
      );
    } else {
      setSelectedItems((items) => [
        ...items,
        {
          testId: test.id,
          name: test.name,
          category: test.category,
          qty: 1,
          unitPrice: test.price,
        },
      ]);
    }
  };

  // Remove test
  const handleRemoveItem = (testId: string) => {
    setSelectedItems((items) => items.filter((i) => i.testId !== testId));
  };

  // Quick fill paid amount
  const setQuickPaid = (type: "full" | "zero" | "half") => {
    if (type === "full") setPaidAmount(totals.total);
    else if (type === "zero") setPaidAmount(0);
    else if (type === "half") setPaidAmount(Math.round(totals.total / 2));
  };

  // Handle Quick Register
  const handleQuickRegister = (input: PatientInput) => {
    const created = addPatient(input);
    setSelectedPatientId(created.id);
    setRegisterOpen(false);
    toast.success(`Registered ${created.name} (${created.id})`);
  };

  // Confirm and Submit Bill
  const handleSubmitBill = () => {
    if (!selectedPatientId) {
      toast.error("Please select or register a patient.");
      return;
    }
    if (selectedItems.length === 0) {
      toast.error("Please select at least one test for this bill.");
      return;
    }
    if (totals.errors.discount) {
      toast.error(totals.errors.discount);
      return;
    }
    if (totals.errors.paid) {
      toast.error(totals.errors.paid);
      return;
    }

    setIsSubmitting(true);
    try {
      const now = new Date();
      const bill = createBill({
        patientId: selectedPatientId,
        items: selectedItems,
        discountType,
        discountValue,
        additionalCharges,
        additionalDesc,
        payment:
          paidAmount > 0
            ? {
                amount: paidAmount,
                mode: paymentMode,
                date: now.toISOString(),
                reference: paymentRef.trim(),
              }
            : null,
      });

      toast.success(`Invoice ${bill.id} generated successfully!`);
      navigate({ to: "/billing/$billId", params: { billId: bill.id } });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create bill");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Billing Workspace"
        subtitle="Select patient, assemble test profile, apply adjustments, and generate official receipt."
        crumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Billing", to: "/billing" },
          { label: "New Bill" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left 7 Columns: Patient Selection + Test Selection */}
        <div className="space-y-6 lg:col-span-7">
          {/* Step 1: Patient Selection */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  1
                </span>
                <h3 className="text-sm font-semibold text-foreground">Select or Register Patient</h3>
              </div>
              <Button size="sm" variant="outline" onClick={() => setRegisterOpen(true)}>
                <UserPlus className="h-3.5 w-3.5 mr-1" /> Quick Register
              </Button>
            </div>

            {selectedPatient ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary-soft/30 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground text-sm">{selectedPatient.name}</span>
                      <span className="id-chip font-bold">{selectedPatient.id}</span>
                      <span className="text-xs text-muted-foreground">
                        ({selectedPatient.gender}, {selectedPatient.age}y)
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      <span>Mobile: {maskMobile(selectedPatient.mobile)}</span>
                      {selectedPatient.referringDoctor && (
                        <span className="ml-2 font-medium text-foreground">
                          • Ref: {selectedPatient.referringDoctor}
                        </span>
                      )}
                      {selectedPatient.outstanding > 0 && (
                        <span className="ml-2 font-semibold text-danger">
                          • Prev Due: {formatINR(selectedPatient.outstanding)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedPatientId("")}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <SearchInput
                  value={patientSearch}
                  onChange={setPatientSearch}
                  placeholder="Search existing patients by name, ID or 10-digit mobile…"
                />
                <div className="max-h-48 overflow-y-auto divide-y divide-border rounded-md border border-border">
                  {filteredPatients.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No matching patients. Click "Quick Register" above to create a record.
                    </div>
                  ) : (
                    filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPatientId(p.id)}
                        className="flex cursor-pointer items-center justify-between p-2.5 hover:bg-muted/50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{p.name}</span>
                            <span className="id-chip">{p.id}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {p.gender}, {p.age}y
                            </span>
                          </div>
                          <span className="num text-[11px] text-muted-foreground">{maskMobile(p.mobile)}</span>
                        </div>
                        <Button size="sm" variant="soft" className="h-7 text-xs">
                          Select
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Test Search & Selection */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  2
                </span>
                <h3 className="text-sm font-semibold text-foreground">Add Laboratory Tests</h3>
              </div>
              <span className="text-xs text-muted-foreground">{activeTests.length} tests active</span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <SearchInput
                  value={testSearch}
                  onChange={setTestSearch}
                  placeholder="Search test name or code (e.g. CBC, Lipid, HbA1c)…"
                  className="flex-1"
                />
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setTestCategory("all")}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    testCategory === "all"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  All
                </button>
                {TEST_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTestCategory(c)}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                      testCategory === c
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Test Catalog Grid */}
              <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-md border border-border">
                {filteredTests.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No active tests match your filter.
                  </div>
                ) : (
                  filteredTests.map((test) => {
                    const isAdded = selectedItems.some((i) => i.testId === test.id);
                    return (
                      <div
                        key={test.id}
                        className="flex items-center justify-between p-2.5 hover:bg-muted/40 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-xs text-foreground truncate">{test.name}</span>
                            <span className="id-chip">{test.id}</span>
                          </div>
                          <span className="text-[11px] text-muted-foreground">{test.category}</span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="num font-semibold text-xs text-foreground">{formatINR(test.price)}</span>
                          <Button
                            size="sm"
                            variant={isAdded ? "outline" : "soft"}
                            className="h-7 text-xs"
                            onClick={() => handleAddTest(test)}
                          >
                            {isAdded ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-success mr-1" /> Added
                              </>
                            ) : (
                              <>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Selected Items, Calculations, Payment */}
        <div className="space-y-6 lg:col-span-5">
          {/* Step 3: Selected Tests Order Summary */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  3
                </span>
                <h3 className="text-sm font-semibold text-foreground">Order Items ({selectedItems.length})</h3>
              </div>
              {selectedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedItems([])}
                  className="text-xs text-danger hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedItems.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                <FlaskConical className="mx-auto h-7 w-7 text-muted-foreground/60 mb-2" />
                Select laboratory tests from the catalog on the left to add them to this invoice.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {selectedItems.map((item) => (
                  <div key={item.testId} className="flex items-center justify-between py-2 text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">{item.name}</p>
                      <span className="id-chip">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="num font-medium text-foreground">
                        {item.qty > 1 && `${item.qty} × `}
                        {formatINR(item.unitPrice * item.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.testId)}
                        className="text-muted-foreground hover:text-danger p-1"
                        title="Remove test"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 4 & 5: Adjustments, Totals & Payment */}
          <div className="panel p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                4
              </span>
              <h3 className="text-sm font-semibold text-foreground">Adjustments & Payment</h3>
            </div>

            <div className="space-y-3 text-xs">
              {/* Discount Entry */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Discount Type">
                  <Select
                    value={discountType}
                    onValueChange={(v) => setDiscountType(v as DiscountType)}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed (₹)</SelectItem>
                      <SelectItem value="percent">Percentage (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={`Discount Value ${discountType === "percent" ? "(%)" : "(₹)"}`}>
                  <Input
                    type="number"
                    min={0}
                    max={discountType === "percent" ? 100 : totals.subtotal}
                    value={discountValue || ""}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="h-8 num"
                    placeholder="0"
                  />
                </Field>
              </div>

              {/* Additional Charges */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Addl. Charges (₹)">
                  <Input
                    type="number"
                    min={0}
                    value={additionalCharges || ""}
                    onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                    className="h-8 num"
                    placeholder="0"
                  />
                </Field>
                <Field label="Reason / Notes">
                  <Input
                    value={additionalDesc}
                    onChange={(e) => setAdditionalDesc(e.target.value)}
                    placeholder="e.g. Home collection"
                    className="h-8"
                  />
                </Field>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="num font-medium text-foreground">{formatINR(totals.subtotal)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span className="num font-medium">- {formatINR(totals.discount)}</span>
                  </div>
                )}
                {totals.additionalCharges > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Addl. Charges ({additionalDesc || "Extra"})</span>
                    <span className="num font-medium text-foreground">+ {formatINR(totals.additionalCharges)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-sm font-bold text-foreground">
                  <span>Net Payable Total</span>
                  <span className="num text-primary">{formatINR(totals.total)}</span>
                </div>
              </div>

              {/* Payment Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">Collect Payment</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setQuickPaid("full")}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickPaid("half")}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      50%
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickPaid("zero")}
                      className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      Due
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Amount Paid Now (₹)" required>
                    <Input
                      type="number"
                      min={0}
                      max={totals.total}
                      value={paidAmount || ""}
                      onChange={(e) => setPaidAmount(Number(e.target.value))}
                      className="h-9 num font-semibold text-success"
                      placeholder="0"
                    />
                  </Field>
                  <Field label="Payment Mode" required>
                    <Select
                      value={paymentMode}
                      onValueChange={(v) => setPaymentMode(v as PaymentMode)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                {paymentMode !== "Cash" && (
                  <Field label="Transaction / UPI Reference ID">
                    <Input
                      value={paymentRef}
                      onChange={(e) => setPaymentRef(e.target.value)}
                      placeholder="e.g. UPI827103982 or TXN91283"
                      className="h-8 font-mono text-xs"
                    />
                  </Field>
                )}

                <div className="flex items-center justify-between rounded bg-muted/60 px-3 py-2">
                  <span className="text-muted-foreground font-medium">Remaining Balance Due:</span>
                  <span
                    className={`num font-bold text-sm ${totals.pending > 0 ? "text-danger" : "text-success"}`}
                  >
                    {formatINR(totals.pending)}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <Button
              className="w-full mt-4"
              size="lg"
              disabled={isSubmitting || selectedItems.length === 0 || !selectedPatientId}
              onClick={handleSubmitBill}
            >
              <FileCheck className="h-5 w-5 mr-2" />
              Generate & Print Invoice ({formatINR(totals.total)})
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Register Dialog */}
      <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick Register Patient</DialogTitle>
            <DialogDescription>
              Register a new patient record to immediately proceed with test billing.
            </DialogDescription>
          </DialogHeader>
          <PatientForm
            submitLabel="Register & Select for Billing"
            onSubmit={handleQuickRegister}
            onCancel={() => setRegisterOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
