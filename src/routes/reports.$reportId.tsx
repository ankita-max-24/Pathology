import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Layers,
  Package,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangeFilter, rangeFromPreset, type DateRange } from "@/components/common/DateRangeFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { PaymentStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportCSV } from "@/lib/lab/export";
import { formatDate, formatDateTime, formatINR, formatShortDate, maskMobile, todayKey } from "@/lib/lab/format";
import { currentStock } from "@/lib/lab/selectors";
import { useLab } from "@/lib/lab/store";
import type { BillItem, Payment } from "@/lib/lab/types";

export const Route = createFileRoute("/reports/$reportId")({
  head: () => ({
    meta: [
      { title: "Report View — GNS Pathology Lab" },
      { name: "description", content: "Audited laboratory report, statistics and printable e-statement." },
      { property: "og:title", content: "Report View — GNS Pathology Lab" },
      { property: "og:description", content: "Audited laboratory report, statistics and printable e-statement." },
    ],
  }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const { db, bills, patients } = useLab();
  const today = todayKey();

  // Date filters
  const [singleDate, setSingleDate] = useState<string>(today);
  const [range, setRange] = useState<DateRange>(rangeFromPreset("month"));

  const settings = db.settings;

  // 1. Daily E-Statement Data
  const statementData = useMemo(() => {
    const dayBills = bills.filter((b) => b.dateKey === singleDate);
    const dayPayments = db.payments.filter((p) => p.date.startsWith(singleDate));
    const dayTxns = db.stockTxns.filter((t) => t.date === singleDate);

    const totalBilled = dayBills.reduce((s, b) => s + b.total, 0);
    const totalDiscount = dayBills.reduce((s, b) => s + b.discountAmount, 0);
    const totalCollected = dayPayments.reduce((s, p) => s + p.amount, 0);
    const pendingGenerated = dayBills.reduce((s, b) => s + b.pending, 0);

    const cashCollected = dayPayments.filter((p) => p.mode === "Cash").reduce((s, p) => s + p.amount, 0);
    const upiCollected = dayPayments.filter((p) => p.mode === "UPI").reduce((s, p) => s + p.amount, 0);
    const cardCollected = dayPayments.filter((p) => p.mode === "Card").reduce((s, p) => s + p.amount, 0);
    const otherCollected = dayPayments.filter((p) => p.mode === "Other").reduce((s, p) => s + p.amount, 0);

    // Tests breakdown for the day
    const testMap = new Map<string, { name: string; category: string; count: number; revenue: number }>();
    for (const b of dayBills) {
      for (const item of b.items) {
        const cur = testMap.get(item.testId) || { name: item.name, category: item.category, count: 0, revenue: 0 };
        cur.count += item.qty;
        cur.revenue += item.unitPrice * item.qty;
        testMap.set(item.testId, cur);
      }
    }
    const testsList = Array.from(testMap.values()).sort((a, b) => b.count - a.count);

    return {
      date: singleDate,
      billCount: dayBills.length,
      patientCount: new Set(dayBills.map((b) => b.patientId)).size,
      totalBilled,
      totalDiscount,
      totalCollected,
      pendingGenerated,
      cashCollected,
      upiCollected,
      cardCollected,
      otherCollected,
      testsList,
      payments: dayPayments,
    };
  }, [bills, db.payments, db.stockTxns, singleDate]);

  // 2. Daily Patient Registrations Data
  const patientReportRows = useMemo(() => {
    return patients
      .filter((p) => p.registeredKey >= range.from && p.registeredKey <= range.to)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [patients, range]);

  // 3. Test Volume & Revenue Data
  const testVolumeRows = useMemo(() => {
    const rangeBills = bills.filter((b) => b.dateKey >= range.from && b.dateKey <= range.to);
    const map = new Map<string, { id: string; name: string; category: string; orders: number; revenue: number }>();

    for (const b of rangeBills) {
      for (const item of b.items) {
        const cur = map.get(item.testId) || {
          id: item.testId,
          name: item.name,
          category: item.category,
          orders: 0,
          revenue: 0,
        };
        cur.orders += item.qty;
        cur.revenue += item.unitPrice * item.qty;
        map.set(item.testId, cur);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.orders - a.orders || b.revenue - a.revenue);
  }, [bills, range]);

  // 4. Billing & Invoicing Data
  const billingReportRows = useMemo(() => {
    return bills
      .filter((b) => b.dateKey >= range.from && b.dateKey <= range.to)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [bills, range]);

  // 5. Collections Reconciliation Data
  const collectionsRows = useMemo(() => {
    return db.payments
      .filter((p) => {
        const d = p.date.slice(0, 10);
        return d >= range.from && d <= range.to;
      })
      .map((p) => {
        const bill = bills.find((b) => b.id === p.billId);
        return {
          ...p,
          patientName: bill?.patientName || "Unknown",
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.payments, bills, range]);

  // 6. Outstanding Receivables Data
  const outstandingRows = useMemo(() => {
    return patients
      .filter((p) => p.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [patients]);

  // 7. Stock Consumption Data
  const stockReportRows = useMemo(() => {
    return db.stockTxns
      .filter((t) => t.date >= range.from && t.date <= range.to)
      .map((t) => {
        const prod = db.products.find((p) => p.id === t.productId);
        return { ...t, productName: prod?.name || t.productId, unit: prod?.unit || "units" };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [db.stockTxns, db.products, range]);

  // Export handlers
  const handleExportStatement = () => {
    exportCSV(
      `daily-statement-${singleDate}.csv`,
      ["Metric", "Value"],
      [
        ["Date", singleDate],
        ["Invoices Generated", statementData.billCount],
        ["Unique Patients", statementData.patientCount],
        ["Total Billed", statementData.totalBilled],
        ["Discounts Allowed", statementData.totalDiscount],
        ["Total Collections", statementData.totalCollected],
        ["Cash Collections", statementData.cashCollected],
        ["UPI Collections", statementData.upiCollected],
        ["Card Collections", statementData.cardCollected],
        ["Pending Balance Generated", statementData.pendingGenerated],
      ],
    );
  };

  return (
    <div className="space-y-6">
      {/* Action / Nav Header (hidden on print) */}
      <div className="print:hidden">
        <PageHeader
          title={
            reportId === "daily-statement"
              ? "Daily E-Statement"
              : reportId === "patients"
                ? "Daily Patient Registrations Report"
                : reportId === "test-volume"
                  ? "Test Volume & Revenue Analysis"
                  : reportId === "billing"
                    ? "Billing & Invoicing Report"
                    : reportId === "collections"
                      ? "Collections & Reconciliation Report"
                      : reportId === "outstanding"
                        ? "Outstanding Receivables & Aging Report"
                        : "Stock Movement & Consumption Report"
          }
          subtitle="Audit-ready laboratory data with instant CSV export and print preview."
          crumbs={[
            { label: "Dashboard", to: "/" },
            { label: "Reports", to: "/reports" },
            { label: reportId },
          ]}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" asChild>
                <Link to="/reports">
                  <ArrowLeft className="h-4 w-4" /> Reports Hub
                </Link>
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Print Document
              </Button>
            </div>
          }
        />
      </div>

      {/* REPORT 1: DAILY E-STATEMENT */}
      {reportId === "daily-statement" && (
        <div className="space-y-6">
          {/* Date Selector (hidden on print) */}
          <div className="print:hidden flex items-center justify-between rounded-lg border border-border bg-card p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-foreground">Select Statement Date:</span>
              <Input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="h-8 w-44 text-xs font-medium"
              />
              {singleDate === today && (
                <span className="rounded bg-teal-soft px-2 py-0.5 text-[11px] font-semibold text-teal">
                  Today's Closing
                </span>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={handleExportStatement}>
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          {/* Printable E-Statement Sheet */}
          <div className="print-area mx-auto max-w-4xl rounded-lg border border-border bg-card p-6 md:p-8 shadow-sm print:border-none print:shadow-none print:p-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b-2 border-primary/20 pb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{settings.labName}</h1>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                  End-of-Day E-Statement & Executive Audit
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.address}, {settings.city} • Reg: {settings.registrationNo} • Phone: {settings.phone}
                </p>
              </div>
              <div className="text-right sm:min-w-[180px]">
                <span className="eyebrow block">Statement Date</span>
                <span className="text-base font-bold text-foreground block">{formatDate(singleDate)}</span>
                <span className="text-xs text-muted-foreground block mt-1">
                  Generated: {formatDateTime(new Date().toISOString())}
                </span>
              </div>
            </div>

            {/* Financial Summary KPI Cards */}
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded border border-border bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground block">Total Invoices</span>
                <span className="num text-xl font-bold text-foreground block mt-1">
                  {statementData.billCount}
                </span>
                <span className="text-[10px] text-muted-foreground">({statementData.patientCount} unique patients)</span>
              </div>
              <div className="rounded border border-border bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground block">Gross Billing</span>
                <span className="num text-xl font-bold text-primary block mt-1">
                  {formatINR(statementData.totalBilled)}
                </span>
                <span className="text-[10px] text-muted-foreground">Discount: {formatINR(statementData.totalDiscount)}</span>
              </div>
              <div className="rounded border border-border bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground block">Total Collections</span>
                <span className="num text-xl font-bold text-success block mt-1">
                  {formatINR(statementData.totalCollected)}
                </span>
                <span className="text-[10px] text-success">Cash, UPI & Card</span>
              </div>
              <div className="rounded border border-border bg-muted/20 p-3">
                <span className="text-[11px] font-medium text-muted-foreground block">New Pending Dues</span>
                <span className="num text-xl font-bold text-danger block mt-1">
                  {formatINR(statementData.pendingGenerated)}
                </span>
                <span className="text-[10px] text-danger">Uncollected balances</span>
              </div>
            </div>

            {/* Payment Modes Breakdown */}
            <div className="mt-6 rounded-lg border border-border p-4 bg-muted/10">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-3">
                Collections Reconciliation by Payment Mode
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div className="border-r border-border/60 pr-2">
                  <span className="text-muted-foreground block">Cash Collected</span>
                  <span className="num text-base font-bold text-foreground block mt-0.5">
                    {formatINR(statementData.cashCollected)}
                  </span>
                </div>
                <div className="border-r border-border/60 pr-2">
                  <span className="text-muted-foreground block">UPI / Digital</span>
                  <span className="num text-base font-bold text-foreground block mt-0.5">
                    {formatINR(statementData.upiCollected)}
                  </span>
                </div>
                <div className="border-r border-border/60 pr-2">
                  <span className="text-muted-foreground block">Credit / Debit Card</span>
                  <span className="num text-base font-bold text-foreground block mt-0.5">
                    {formatINR(statementData.cardCollected)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Other Modes</span>
                  <span className="num text-base font-bold text-foreground block mt-0.5">
                    {formatINR(statementData.otherCollected)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tests Performed Today */}
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">
                Diagnostic Tests Executed ({statementData.testsList.reduce((s, t) => s + t.count, 0)} total tests)
              </h3>
              {statementData.testsList.length === 0 ? (
                <p className="text-xs text-muted-foreground">No tests billed on this date.</p>
              ) : (
                <div className="overflow-hidden rounded border border-border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted text-muted-foreground text-[11px]">
                      <tr>
                        <th className="py-2 px-3">Test Description</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3 text-center">Volume</th>
                        <th className="py-2 px-3 text-right">Revenue (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {statementData.testsList.map((t, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-medium text-foreground">{t.name}</td>
                          <td className="py-2 px-3 text-muted-foreground">{t.category}</td>
                          <td className="py-2 px-3 text-center num">{t.count}</td>
                          <td className="py-2 px-3 text-right num font-semibold text-foreground">
                            {formatINR(t.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Signatures */}
            <div className="mt-12 flex items-end justify-between border-t border-border pt-6 text-xs text-muted-foreground">
              <div className="text-center min-w-[140px]">
                <div className="border-b border-foreground/40 pb-1 mb-1 italic">Billing Receptionist</div>
                <p>Cashier On Duty</p>
              </div>
              <div className="text-center min-w-[140px]">
                <div className="border-b border-foreground/40 pb-1 mb-1 italic">Lab Director / Auditor</div>
                <p>Audited & Verified</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT 2: PATIENTS REGISTRATION */}
      {reportId === "patients" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <DateRangeFilter value={range} onChange={setRange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportCSV(
                  `patients-report-${range.from}-to-${range.to}.csv`,
                  ["Patient ID", "Name", "Age", "Gender", "Mobile", "Referring Doctor", "Registered"],
                  patientReportRows.map((p) => [p.id, p.name, p.age, p.gender, p.mobile, p.referringDoctor, formatDate(p.createdAt)]),
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <div className="panel overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">
                Registered Patients ({patientReportRows.length} found)
              </h3>
            </div>
            <div className="divide-y divide-border text-xs">
              {patientReportRows.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                  <div>
                    <div className="flex items-center gap-2">
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} className="id-chip font-bold hover:text-primary">
                        {p.id}
                      </Link>
                      <span className="font-semibold text-foreground">{p.name}</span>
                      <span className="text-muted-foreground">({p.gender}, {p.age}y)</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Mob: {maskMobile(p.mobile)} {p.referringDoctor && ` • Ref: ${p.referringDoctor}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-muted-foreground">{formatDate(p.createdAt)}</span>
                    <span className="block num font-medium text-foreground">Visits: {p.visits}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* REPORT 3: TEST VOLUME */}
      {reportId === "test-volume" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <DateRangeFilter value={range} onChange={setRange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportCSV(
                  `test-volume-${range.from}-to-${range.to}.csv`,
                  ["Test ID", "Test Name", "Category", "Orders Count", "Total Revenue (INR)"],
                  testVolumeRows.map((t) => [t.id, t.name, t.category, t.orders, t.revenue]),
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <div className="panel overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Test Code</th>
                  <th className="py-2.5 px-3">Test Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Orders Count</th>
                  <th className="py-2.5 px-3 text-right">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {testVolumeRows.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 id-chip font-bold">{t.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">{t.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{t.category}</td>
                    <td className="py-2.5 px-3 text-center num font-bold text-foreground">{t.orders}</td>
                    <td className="py-2.5 px-3 text-right num font-semibold text-primary">
                      {formatINR(t.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 4: BILLING & INVOICING */}
      {reportId === "billing" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <DateRangeFilter value={range} onChange={setRange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportCSV(
                  `billing-report-${range.from}-to-${range.to}.csv`,
                  ["Invoice ID", "Date", "Patient Name", "Gross", "Discount", "Net Total", "Paid", "Pending", "Status"],
                  billingReportRows.map((b) => [
                    b.id,
                    formatDate(b.createdAt),
                    b.patientName,
                    b.subtotal,
                    b.discountAmount,
                    b.total,
                    b.paid,
                    b.pending,
                    b.status,
                  ]),
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <div className="panel overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Invoice</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3 text-right">Gross</th>
                  <th className="py-2.5 px-3 text-right">Discount</th>
                  <th className="py-2.5 px-3 text-right">Net Total</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {billingReportRows.map((b) => (
                  <tr key={b.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 id-chip font-bold">{b.id}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(b.createdAt)}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{b.patientName}</td>
                    <td className="py-2.5 px-3 text-right num">{formatINR(b.subtotal)}</td>
                    <td className="py-2.5 px-3 text-right num text-success">
                      {b.discountAmount > 0 ? `-${formatINR(b.discountAmount)}` : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right num font-bold text-foreground">{formatINR(b.total)}</td>
                    <td className="py-2.5 px-3 text-right num font-semibold text-success">{formatINR(b.paid)}</td>
                    <td className="py-2.5 px-3 text-right num font-semibold text-danger">
                      {b.pending > 0 ? formatINR(b.pending) : "—"}
                    </td>
                    <td className="py-2.5 px-3">
                      <PaymentStatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 5: COLLECTIONS & RECONCILIATION */}
      {reportId === "collections" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <DateRangeFilter value={range} onChange={setRange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportCSV(
                  `collections-report-${range.from}-to-${range.to}.csv`,
                  ["Receipt ID", "Date", "Invoice ID", "Patient", "Mode", "Reference", "Amount"],
                  collectionsRows.map((p) => [p.id, formatDateTime(p.date), p.billId, p.patientName, p.mode, p.reference, p.amount]),
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <div className="panel overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Receipt ID</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Invoice</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Reference #</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {collectionsRows.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 id-chip font-bold">{p.id}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDateTime(p.date)}</td>
                    <td className="py-2.5 px-3 id-chip">{p.billId}</td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">{p.patientName}</td>
                    <td className="py-2.5 px-3 font-medium text-foreground">{p.mode}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">{p.reference || "—"}</td>
                    <td className="py-2.5 px-3 text-right num font-bold text-success">{formatINR(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 6: OUTSTANDING RECEIVABLES */}
      {reportId === "outstanding" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
            <span className="text-xs font-semibold text-foreground">
              Total Outstanding Receivables:{" "}
              <strong className="text-danger num font-bold text-sm">
                {formatINR(outstandingRows.reduce((s, p) => s + p.outstanding, 0))}
              </strong>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportCSV(
                  `outstanding-receivables-${today}.csv`,
                  ["Patient ID", "Name", "Mobile", "Total Billed", "Total Paid", "Pending Outstanding"],
                  outstandingRows.map((p) => [p.id, p.name, p.mobile, p.billed, p.paid, p.outstanding]),
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <div className="panel overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Patient ID</th>
                  <th className="py-2.5 px-3">Patient Name</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3 text-right">Total Billed</th>
                  <th className="py-2.5 px-3 text-right">Total Paid</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {outstandingRows.map((p) => (
                  <tr key={p.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 id-chip font-bold">{p.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">
                      <Link to="/patients/$patientId" params={{ patientId: p.id }} className="hover:text-primary">
                        {p.name}
                      </Link>
                    </td>
                    <td className="py-2.5 px-3 num text-muted-foreground">{maskMobile(p.mobile)}</td>
                    <td className="py-2.5 px-3 text-right num">{formatINR(p.billed)}</td>
                    <td className="py-2.5 px-3 text-right num text-success">{formatINR(p.paid)}</td>
                    <td className="py-2.5 px-3 text-right num font-bold text-danger">{formatINR(p.outstanding)}</td>
                    <td className="py-2.5 px-3 text-right">
                      <Button size="sm" variant="ghost" asChild>
                        <Link to="/patients/$patientId" params={{ patientId: p.id }}>
                          View Account →
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 7: STOCK & CONSUMPTION */}
      {reportId === "stock" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
            <DateRangeFilter value={range} onChange={setRange} />
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                exportCSV(
                  `stock-movement-${range.from}-to-${range.to}.csv`,
                  ["Date", "Product", "Type", "Quantity", "Amount", "Supplier/Patient", "Ref"],
                  stockReportRows.map((t) => [t.date, t.productName, t.type, t.qty, t.amount, t.supplier || t.patientId, t.reference]),
                )
              }
            >
              <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
            </Button>
          </div>

          <div className="panel overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Movement Type</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Total Cost</th>
                  <th className="py-2.5 px-3">Vendor / Patient Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stockReportRows.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 text-muted-foreground">{formatDate(t.date)}</td>
                    <td className="py-2.5 px-3 font-semibold text-foreground">{t.productName}</td>
                    <td className="py-2.5 px-3">
                      <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-foreground">
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right num font-bold text-foreground">
                      {t.type === "Purchase" || t.type === "Opening" ? `+${t.qty}` : `-${t.qty}`} {t.unit}
                    </td>
                    <td className="py-2.5 px-3 text-right num font-medium text-foreground">
                      {t.amount > 0 ? formatINR(t.amount) : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {t.supplier || t.patientId || t.reference || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
