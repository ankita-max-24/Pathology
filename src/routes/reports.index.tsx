import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  BarChart3,
  CalendarCheck,
  CreditCard,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  Layers,
  Package,
  Printer,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo } from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import { formatINR, todayKey } from "@/lib/lab/format";
import { useLab } from "@/lib/lab/store";

export const Route = createFileRoute("/reports/")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — GNS Pathology Lab" },
      { name: "description", content: "Executive analytics, billing reports, collections reconciliation and Daily E-Statement." },
      { property: "og:title", content: "Reports & Analytics — GNS Pathology Lab" },
      { property: "og:description", content: "Executive analytics, billing reports, collections reconciliation and Daily E-Statement." },
    ],
  }),
  component: ReportsHubPage,
});

export interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  tag: string;
  highlightKey: string;
}

export const REPORTS_LIST: ReportDef[] = [
  {
    id: "daily-statement",
    title: "Daily E-Statement",
    description: "End-of-day executive financial summary with collections, tests performed, and closing balance.",
    icon: FileText,
    tag: "Core Audit",
    highlightKey: "Daily Close",
  },
  {
    id: "patients",
    title: "Daily Patient Registrations",
    description: "Patient registration log categorized by referring doctors, demographics, and age groups.",
    icon: Users,
    tag: "Demographics",
    highlightKey: "Patients",
  },
  {
    id: "test-volume",
    title: "Test Volume & Revenue",
    description: "Most requested diagnostic tests, category breakdown, frequency counts, and total revenue generated.",
    icon: Layers,
    tag: "Diagnostics",
    highlightKey: "Volumes",
  },
  {
    id: "billing",
    title: "Billing & Invoicing Analysis",
    description: "Gross billings, discounts allowed, additional charges, and net invoicing breakdown.",
    icon: BarChart3,
    tag: "Financials",
    highlightKey: "Revenue",
  },
  {
    id: "collections",
    title: "Payment & Collections Reconciliation",
    description: "Cash vs. UPI vs. Card settlement breakdown with daily transaction verification.",
    icon: CreditCard,
    tag: "Cash & Digital",
    highlightKey: "Cash Flow",
  },
  {
    id: "outstanding",
    title: "Outstanding Dues & Aging",
    description: "Patient-wise pending invoice dues, payment defaults, and receivable aging analysis.",
    icon: IndianRupee,
    tag: "Receivables",
    highlightKey: "Pending Dues",
  },
  {
    id: "stock",
    title: "Stock & Consumption Report",
    description: "Medical supplies consumption rates, purchase expenditure log, and inventory turnover.",
    icon: Package,
    tag: "Supplies",
    highlightKey: "Inventory",
  },
];

function ReportsHubPage() {
  const { db, bills, patients } = useLab();
  const today = todayKey();

  const metrics = useMemo(() => {
    const totalBilled = bills.reduce((s, b) => s + b.total, 0);
    const totalPaid = bills.reduce((s, b) => s + b.paid, 0);
    const totalPending = bills.reduce((s, b) => s + b.pending, 0);

    const todayBills = bills.filter((b) => b.dateKey === today);
    const todayCollected = db.payments.filter((p) => p.date.startsWith(today)).reduce((s, p) => s + p.amount, 0);

    return {
      totalBilled,
      totalPaid,
      totalPending,
      todayBilled: todayBills.reduce((s, b) => s + b.total, 0),
      todayCollected,
      totalPatients: patients.length,
    };
  }, [bills, db.payments, patients, today]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics Hub"
        subtitle="Audited financial summaries, test volume statistics, daily e-statements and accounts reconciliation."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Reports" }]}
        actions={
          <Button asChild>
            <Link to="/reports/$reportId" params={{ reportId: "daily-statement" }}>
              <Printer className="h-4 w-4 mr-1.5" /> Open Today's E-Statement
            </Link>
          </Button>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Today's Collections" value={formatINR(metrics.todayCollected)} icon={CreditCard} tone="success" />
        <StatCard label="Total Billed Revenue" value={formatINR(metrics.totalBilled)} icon={BarChart3} tone="teal" />
        <StatCard label="Cumulative Collections" value={formatINR(metrics.totalPaid)} icon={IndianRupee} tone="neutral" />
        <StatCard label="Pending Outstanding" value={formatINR(metrics.totalPending)} icon={AlertCircle} tone="danger" />
      </div>

      {/* 7 Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS_LIST.map((rep) => {
          const Icon = rep.icon;
          const isFeatured = rep.id === "daily-statement";
          return (
            <div
              key={rep.id}
              className={`panel flex flex-col justify-between p-5 transition-all hover:border-primary/50 hover:shadow-md ${
                isFeatured ? "border-primary/40 bg-primary-soft/10 ring-1 ring-primary/20" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="rounded bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                    {rep.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground mb-1">{rep.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{rep.description}</p>
              </div>

              <div className="mt-5 border-t border-border pt-3">
                <Button variant={isFeatured ? "default" : "outline"} size="sm" className="w-full" asChild>
                  <Link to="/reports/$reportId" params={{ reportId: rep.id }}>
                    Generate Report →
                  </Link>
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
