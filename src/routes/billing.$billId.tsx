import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  IndianRupee,
  MapPin,
  Phone,
  Plus,
  Printer,
  QrCode,
  Receipt,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Field } from "@/components/common/Field";
import { PageHeader } from "@/components/common/PageHeader";
import { PaymentStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, formatDateTime, formatINR, maskMobile } from "@/lib/lab/format";
import { useLab } from "@/lib/lab/store";
import { PAYMENT_MODES, type PaymentMode } from "@/lib/lab/types";

export const Route = createFileRoute("/billing/$billId")({
  head: () => ({
    meta: [
      { title: "Invoice & Receipt — GNS Pathology Lab" },
      { name: "description", content: "Official diagnostic invoice, itemized test charges, and payment receipt." },
      { property: "og:title", content: "Invoice & Receipt — GNS Pathology Lab" },
      { property: "og:description", content: "Official diagnostic invoice, itemized test charges, and payment receipt." },
    ],
  }),
  component: BillDetailsPage,
});

function BillDetailsPage() {
  const { billId } = Route.useParams();
  const { bills, db, addPayment } = useLab();

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMode, setPayMode] = useState<PaymentMode>("Cash");
  const [payRef, setPayRef] = useState<string>("");

  // Find bill view
  const bill = useMemo(() => bills.find((b) => b.id === billId), [bills, billId]);
  const settings = db.settings;

  const handleOpenPaymentDialog = () => {
    if (!bill) return;
    setPayAmount(bill.pending);
    setPayMode(settings.defaultPaymentMode || "Cash");
    setPayRef("");
    setPaymentDialogOpen(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bill) return;
    if (payAmount <= 0) {
      toast.error("Please enter a valid payment amount greater than zero.");
      return;
    }
    if (payAmount > bill.pending) {
      toast.error(`Payment amount cannot exceed balance due of ${formatINR(bill.pending)}.`);
      return;
    }

    try {
      addPayment({
        billId: bill.id,
        amount: payAmount,
        mode: payMode,
        date: new Date().toISOString(),
        reference: payRef.trim(),
      });
      toast.success(`Payment of ${formatINR(payAmount)} recorded successfully!`);
      setPaymentDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment");
    }
  };

  if (!bill) {
    return (
      <div className="space-y-6">
        <PageHeader title="Invoice Not Found" crumbs={[{ label: "Billing", to: "/billing" }, { label: "Not Found" }]} />
        <div className="panel p-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger" />
          <h2 className="mt-4 text-base font-semibold text-foreground">Invoice Not Found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No invoice with ID <span className="font-mono">{billId}</span> exists in the database.
          </p>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link to="/billing">
                <ArrowLeft /> Return to Billing Records
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const patient = bill.patient;

  return (
    <div className="space-y-6">
      {/* Action Bar (hidden on print) */}
      <div className="print:hidden">
        <PageHeader
          title={`Invoice ${bill.id}`}
          subtitle={`Generated on ${formatDateTime(bill.createdAt)} • Status: ${bill.status}`}
          crumbs={[
            { label: "Dashboard", to: "/" },
            { label: "Billing", to: "/billing" },
            { label: bill.id },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/billing">
                  <ArrowLeft className="h-4 w-4" /> All Bills
                </Link>
              </Button>
              {bill.pending > 0 && (
                <Button variant="soft" onClick={handleOpenPaymentDialog}>
                  <CreditCard className="h-4 w-4" /> Collect Due ({formatINR(bill.pending)})
                </Button>
              )}
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print Receipt
              </Button>
            </div>
          }
        />
      </div>

      {/* Official Printable Receipt Document */}
      <div className="print-area mx-auto max-w-4xl rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm print:border-none print:shadow-none print:p-0">
        {/* Lab Letterhead */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-primary/20 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-bold text-primary-foreground text-lg">
                G
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">{settings.labName}</h1>
            </div>
            <p className="mt-1 text-xs font-medium text-muted-foreground tracking-wide uppercase">
              {settings.tagline}
            </p>
            <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
              <p>{settings.address}, {settings.city}, {settings.state} - {settings.pin}</p>
              <p>Phone: {settings.phone} • Email: {settings.email}</p>
              <p className="font-medium text-foreground">
                Reg No: {settings.registrationNo} • GSTIN: {settings.gstin}
              </p>
            </div>
          </div>

          <div className="text-right sm:min-w-[200px] shrink-0">
            <span className="eyebrow block">Diagnostic Invoice / Receipt</span>
            <span className="font-mono text-lg font-bold text-foreground block">{bill.id}</span>
            <span className="text-xs text-muted-foreground block mt-1">
              Date: {formatDate(bill.createdAt)}
            </span>
            <span className="text-xs text-muted-foreground block">
              Time: {formatDateTime(bill.createdAt).split(", ")[1]}
            </span>
            <div className="mt-2 inline-block">
              <PaymentStatusBadge status={bill.status} />
            </div>
          </div>
        </div>

        {/* Patient Details Section */}
        <div className="mt-6 rounded-lg border border-border bg-muted/20 p-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <span className="text-muted-foreground block">Patient Name</span>
              <span className="text-sm font-bold text-foreground">{bill.patientName}</span>
              <span className="id-chip block mt-0.5">{bill.patientId}</span>
            </div>
            <div>
              <span className="text-muted-foreground block">Demographics</span>
              <span className="font-medium text-foreground">
                {patient ? `${patient.gender}, ${patient.age} years` : "—"}
              </span>
              <span className="num block mt-0.5 text-muted-foreground">
                Mob: {patient ? maskMobile(patient.mobile) : "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Referring Doctor</span>
              <span className="font-semibold text-foreground">
                {patient?.referringDoctor || "Self / Consultant"}
              </span>
              {patient?.address && (
                <span className="text-[11px] text-muted-foreground block truncate mt-0.5">
                  {patient.address}, {patient.city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Itemized Tests Conducted Table */}
        <div className="mt-6 overflow-hidden rounded-md border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-muted-foreground uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center font-semibold">#</th>
                <th className="py-2.5 px-3 font-semibold">Test Code & Description</th>
                <th className="py-2.5 px-3 font-semibold">Category</th>
                <th className="py-2.5 px-3 text-right font-semibold">Rate (₹)</th>
                <th className="py-2.5 px-3 text-center font-semibold">Qty</th>
                <th className="py-2.5 px-3 text-right font-semibold">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bill.items.map((item, idx) => (
                <tr key={item.testId} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 text-center text-muted-foreground">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-foreground">
                    <span>{item.name}</span>
                    <span className="id-chip ml-2 font-mono text-[10px]">{item.testId}</span>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{item.category}</td>
                  <td className="py-2.5 px-3 text-right num text-foreground">{formatINR(item.unitPrice)}</td>
                  <td className="py-2.5 px-3 text-center num text-foreground">{item.qty}</td>
                  <td className="py-2.5 px-3 text-right num font-semibold text-foreground">
                    {formatINR(item.unitPrice * item.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Calculation Breakdown */}
        <div className="mt-6 flex flex-col md:flex-row md:items-start justify-between gap-6 border-t border-border pt-4">
          <div className="text-xs text-muted-foreground space-y-2 max-w-sm">
            <p className="font-semibold text-foreground">Payment Terms & Notes:</p>
            <p>1. Reports are strictly confidential and issued for diagnostic assistance.</p>
            <p>2. Please preserve this receipt for specimen collection and report delivery.</p>
            <p className="italic text-foreground">{settings.receiptFooter}</p>
          </div>

          <div className="w-full md:w-72 space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-border/60">
              <span className="text-muted-foreground">Gross Subtotal:</span>
              <span className="num font-medium text-foreground">{formatINR(bill.subtotal)}</span>
            </div>
            {bill.discountAmount > 0 && (
              <div className="flex justify-between py-1 text-success border-b border-border/60">
                <span>Discount ({bill.discountType === "percent" ? `${bill.discountValue}%` : "Fixed"}):</span>
                <span className="num font-medium">- {formatINR(bill.discountAmount)}</span>
              </div>
            )}
            {bill.additionalCharges > 0 && (
              <div className="flex justify-between py-1 border-b border-border/60">
                <span className="text-muted-foreground">
                  Additional Charges ({bill.additionalDesc || "Extra"}):
                </span>
                <span className="num font-medium text-foreground">+ {formatINR(bill.additionalCharges)}</span>
              </div>
            )}
            <div className="flex justify-between py-1.5 text-sm font-bold border-b-2 border-border text-foreground">
              <span>Net Total Amount:</span>
              <span className="num text-primary">{formatINR(bill.total)}</span>
            </div>
            <div className="flex justify-between py-1 text-success">
              <span className="font-medium">Total Paid:</span>
              <span className="num font-bold">{formatINR(bill.paid)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-semibold text-foreground">Balance Due:</span>
              <span
                className={`num font-bold text-sm ${bill.pending > 0 ? "text-danger" : "text-muted-foreground"}`}
              >
                {formatINR(bill.pending)}
              </span>
            </div>
          </div>
        </div>

        {/* Payments Made Ledger */}
        <div className="mt-8 border-t border-border pt-4">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
            Settlement & Payments History
          </h4>
          {bill.payments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No payments recorded against this invoice yet.</p>
          ) : (
            <div className="overflow-hidden rounded border border-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="py-1.5 px-3">Receipt ID</th>
                    <th className="py-1.5 px-3">Date & Time</th>
                    <th className="py-1.5 px-3">Mode</th>
                    <th className="py-1.5 px-3">Reference / Txn ID</th>
                    <th className="py-1.5 px-3 text-right">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bill.payments.map((p) => (
                    <tr key={p.id}>
                      <td className="py-1.5 px-3 id-chip font-bold">{p.id}</td>
                      <td className="py-1.5 px-3">{formatDateTime(p.date)}</td>
                      <td className="py-1.5 px-3 font-medium text-foreground">{p.mode}</td>
                      <td className="py-1.5 px-3 font-mono text-[11px] text-muted-foreground">
                        {p.reference || "—"}
                      </td>
                      <td className="py-1.5 px-3 text-right num font-semibold text-success">
                        {formatINR(p.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Signatures & Verification Area */}
        <div className="mt-12 flex items-end justify-between border-t border-border pt-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <QrCode className="h-10 w-10 text-foreground" />
            <div>
              <p className="font-semibold text-foreground">Scan to verify report online</p>
              <p className="text-[11px]">GNS Pathology Lab Cloud System</p>
            </div>
          </div>

          <div className="text-center min-w-[180px]">
            <div className="border-b border-foreground/40 pb-1 mb-1 font-signature italic text-foreground">
              Authorized Signatory
            </div>
            <p className="font-medium text-foreground">For {settings.labName}</p>
          </div>
        </div>
      </div>

      {/* Collect Payment Modal Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRecordPayment}>
            <DialogHeader>
              <DialogTitle>Collect Pending Balance</DialogTitle>
              <DialogDescription>
                Record payment towards Invoice <strong className="font-mono">{bill.id}</strong> (Total Due: {formatINR(bill.pending)}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <Field label="Amount to Collect (₹)" required>
                <div className="flex">
                  <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                    ₹
                  </span>
                  <Input
                    type="number"
                    min={1}
                    max={bill.pending}
                    value={payAmount || ""}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="num rounded-l-none font-bold text-success"
                    autoFocus
                  />
                </div>
              </Field>

              <Field label="Payment Mode" required>
                <Select value={payMode} onValueChange={(v) => setPayMode(v as PaymentMode)}>
                  <SelectTrigger>
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

              <Field label="Transaction / UPI Reference Number">
                <Input
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Optional for Cash; required for UPI/Card"
                  className="font-mono"
                />
              </Field>

              <div className="rounded bg-muted/60 p-3 flex justify-between">
                <span>Remaining Due after Payment:</span>
                <span className="num font-bold text-foreground">
                  {formatINR(Math.max(0, bill.pending - payAmount))}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <CheckCircle className="h-4 w-4 mr-1.5" /> Confirm & Issue Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
