import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CalendarCheck,
  CreditCard,
  Download,
  Eye,
  FileText,
  IndianRupee,
  PlusCircle,
  ReceiptText,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangeFilter, rangeFromPreset, type DateRange } from "@/components/common/DateRangeFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { PaymentStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCSV } from "@/lib/lab/export";
import { formatDate, formatINR, todayKey } from "@/lib/lab/format";
import type { BillView } from "@/lib/lab/selectors";
import { useLab } from "@/lib/lab/store";

export const Route = createFileRoute("/billing/")({
  validateSearch: (s: Record<string, unknown>): { status?: string } =>
    typeof s["status"] === "string" ? { status: s["status"] } : {},
  head: () => ({
    meta: [
      { title: "Billing Records — GNS Pathology Lab" },
      { name: "description", content: "Search and review diagnostic test invoices, collections and pending balances." },
      { property: "og:title", content: "Billing Records — GNS Pathology Lab" },
      { property: "og:description", content: "Search and review diagnostic test invoices, collections and pending balances." },
    ],
  }),
  component: BillingRecordsPage,
});

function BillingRecordsPage() {
  const { status: initialStatus } = Route.useSearch();
  const { bills } = useLab();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [range, setRange] = useState<DateRange>(rangeFromPreset("all"));
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus || "all");

  const today = todayKey();

  // Metrics
  const stats = useMemo(() => {
    const totalBilled = bills.reduce((s, b) => s + b.total, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paid, 0);
    const totalPending = bills.reduce((s, b) => s + b.pending, 0);
    const paidCount = bills.filter((b) => b.status === "Paid").length;
    const partialCount = bills.filter((b) => b.status === "Partially Paid").length;
    const unpaidCount = bills.filter((b) => b.status === "Pending").length;

    return {
      totalCount: bills.length,
      totalBilled,
      totalPaid,
      totalPending,
      paidCount,
      partialCount,
      unpaidCount,
    };
  }, [bills]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return bills.filter((b) => {
      if (
        term &&
        !b.id.toLowerCase().includes(term) &&
        !b.patientName.toLowerCase().includes(term) &&
        !b.patientId.toLowerCase().includes(term) &&
        !b.items.some((i) => i.name.toLowerCase().includes(term))
      ) {
        return false;
      }
      if (b.dateKey < range.from || b.dateKey > range.to) return false;
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      return true;
    });
  }, [bills, q, range, statusFilter]);

  const columns: Column<BillView>[] = [
    {
      key: "id",
      header: "Invoice #",
      cell: (b) => (
        <Link to="/billing/$billId" params={{ billId: b.id }} className="id-chip font-bold hover:text-primary">
          {b.id}
        </Link>
      ),
      sortValue: (b) => b.id,
    },
    {
      key: "date",
      header: "Date",
      cell: (b) => formatDate(b.createdAt),
      sortValue: (b) => b.createdAt,
    },
    {
      key: "patient",
      header: "Patient",
      cell: (b) => (
        <div>
          <Link
            to="/patients/$patientId"
            params={{ patientId: b.patientId }}
            className="font-medium text-foreground hover:text-primary text-xs"
          >
            {b.patientName}
          </Link>
          <span className="id-chip block">{b.patientId}</span>
        </div>
      ),
      sortValue: (b) => b.patientName,
    },
    {
      key: "tests",
      header: "Tests Conducted",
      cell: (b) => (
        <div className="max-w-[240px] truncate text-xs text-foreground" title={b.items.map((i) => i.name).join(", ")}>
          {b.items.map((i) => i.name).join(", ")}
        </div>
      ),
    },
    {
      key: "subtotal",
      header: "Gross (₹)",
      align: "right",
      cell: (b) => <span className="num">{formatINR(b.subtotal)}</span>,
      sortValue: (b) => b.subtotal,
    },
    {
      key: "total",
      header: "Net Total (₹)",
      align: "right",
      cell: (b) => <span className="num font-bold text-foreground">{formatINR(b.total)}</span>,
      sortValue: (b) => b.total,
    },
    {
      key: "paid",
      header: "Paid (₹)",
      align: "right",
      cell: (b) => <span className="num font-medium text-success">{formatINR(b.paid)}</span>,
      sortValue: (b) => b.paid,
    },
    {
      key: "pending",
      header: "Balance Due (₹)",
      align: "right",
      cell: (b) => (
        <span className={b.pending > 0 ? "num font-semibold text-danger" : "num text-muted-foreground"}>
          {formatINR(b.pending)}
        </span>
      ),
      sortValue: (b) => b.pending,
    },
    {
      key: "status",
      header: "Status",
      cell: (b) => <PaymentStatusBadge status={b.status} />,
      sortValue: (b) => b.status,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (b) => (
        <Button size="sm" variant="ghost" asChild>
          <Link to="/billing/$billId" params={{ billId: b.id }}>
            <Eye className="h-3.5 w-3.5 mr-1" /> View
          </Link>
        </Button>
      ),
    },
  ];

  const handleExport = () => {
    exportCSV(
      `billing-records-${today}.csv`,
      ["Invoice ID", "Date", "Patient ID", "Patient Name", "Tests", "Gross", "Discount", "Net Total", "Paid", "Balance Due", "Status"],
      filteredRows.map((b) => [
        b.id,
        formatDate(b.createdAt),
        b.patientId,
        b.patientName,
        b.items.map((i) => i.name).join("; "),
        b.subtotal,
        b.discountAmount,
        b.total,
        b.paid,
        b.pending,
        b.status,
      ]),
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing Records"
        subtitle="Complete ledger of patient invoices, settlement statuses, and balance collections."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Billing Records" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            <Button asChild>
              <Link to="/billing/new">
                <PlusCircle className="h-4 w-4" /> New Bill
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total Invoices" value={stats.totalCount} icon={ReceiptText} />
        <StatCard label="Total Revenue Billed" value={formatINR(stats.totalBilled)} icon={IndianRupee} tone="teal" />
        <StatCard label="Total Collections" value={formatINR(stats.totalPaid)} icon={CreditCard} tone="success" />
        <StatCard
          label="Pending Receivables"
          value={formatINR(stats.totalPending)}
          icon={IndianRupee}
          tone="danger"
        />
      </div>

      {/* Filter and Table Panel */}
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Search invoice #, patient name, ID or test…"
            className="lg:w-80"
          />
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <DateRangeFilter value={range} onChange={setRange} presets={["all", "today", "week", "month", "custom"]} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[150px] bg-surface">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Paid">Fully Paid</SelectItem>
                <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                <SelectItem value="Pending">Pending Due</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable
          rows={filteredRows}
          columns={columns}
          rowKey={(b) => b.id}
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No invoices match your filters"
          emptyDescription="Try selecting a broader date range or adjusting the status filter."
          emptyAction={
            <Button size="sm" asChild>
              <Link to="/billing/new">
                <PlusCircle className="h-4 w-4 mr-1.5" /> Create New Bill
              </Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
