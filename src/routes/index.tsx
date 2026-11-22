import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  CalendarCheck,
  CreditCard,
  FileText,
  IndianRupee,
  Package,
  PlusCircle,
  ReceiptText,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { PaymentStatusBadge } from "@/components/common/StatusBadge";
import { Button } from "@/components/ui/button";
import { addDays, formatDate, formatINR, formatShortDate, formatTime, maskMobile, todayKey } from "@/lib/lab/format";
import { currentStock } from "@/lib/lab/selectors";
import { useLab } from "@/lib/lab/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — GNS Pathology Lab" },
      { name: "description", content: "Executive overview of lab activity, billing, collections, and stock alerts." },
      { property: "og:title", content: "Dashboard — GNS Pathology Lab" },
      { property: "og:description", content: "Executive overview of lab activity, billing, collections, and stock alerts." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { patients, bills, db } = useLab();
  const navigate = useNavigate();
  const today = todayKey();

  // Metrics
  const stats = useMemo(() => {
    const todayBills = bills.filter((b) => b.dateKey === today);
    const todayPatients = patients.filter((p) => p.registeredKey === today);
    const todayPayments = db.payments.filter((p) => p.date.startsWith(today));

    const todayBilled = todayBills.reduce((s, b) => s + b.total, 0);
    const todayCollected = todayPayments.reduce((s, p) => s + p.amount, 0);
    const totalPending = bills.reduce((s, b) => s + b.pending, 0);

    const lowStockItems = db.products.filter((p) => {
      const stock = currentStock(db, p.id);
      return stock <= p.minStock;
    });

    return {
      todayPatientsCount: todayPatients.length,
      todayBilled,
      todayCollected,
      totalPending,
      lowStockCount: lowStockItems.length,
      lowStockItems,
    };
  }, [patients, bills, db, today]);

  // 7-day trend data
  const trendData = useMemo(() => {
    const days: { dateKey: string; label: string; billing: number; collections: number; patients: number }[] = [];
    for (let i = -6; i <= 0; i++) {
      const dKey = addDays(today, i);
      const dayBills = bills.filter((b) => b.dateKey === dKey);
      const dayPayments = db.payments.filter((p) => p.date.startsWith(dKey));
      const dayBilling = dayBills.reduce((s, b) => s + b.total, 0);
      const dayCollections = dayPayments.reduce((s, p) => s + p.amount, 0);
      const dayPatients = new Set(dayBills.map((b) => b.patientId)).size;

      days.push({
        dateKey: dKey,
        label: formatShortDate(dKey),
        billing: Math.round(dayBilling),
        collections: Math.round(dayCollections),
        patients: dayPatients,
      });
    }
    return days;
  }, [bills, db.payments, today]);

  // Recent 6 bills
  const recentBills = useMemo(() => bills.slice(0, 6), [bills]);

  // Recent 6 patients
  const recentPatients = useMemo(() => patients.slice(0, 6), [patients]);

  return (
    <div className="space-y-6"> 
      <PageHeader
        title="Diagnostic Dashboard"
        subtitle="Real-time operational summary, patient volume, daily revenue, and supply alerts."
        crumbs={[{ label: "Dashboard" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/reports/$reportId" params={{ reportId: "daily-statement" }}>
                <FileText /> Daily E-Statement
              </Link>
            </Button>
            <Button asChild>
              <Link to="/billing/new">
                <PlusCircle /> New Bill
              </Link>
            </Button>
          </div>
        }
      />

      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm">
        <span className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions:</span>
        <Button size="sm" variant="soft" onClick={() => navigate({ to: "/billing/new" })}>
          <ReceiptText /> New Billing
        </Button>
        <Button size="sm" variant="soft" onClick={() => navigate({ to: "/patients/new" })}>
          <UserPlus /> Register Patient
        </Button>
        <Button size="sm" variant="soft" onClick={() => navigate({ to: "/stock", search: { action: "purchase" } })}>
          <Package /> Record Stock Purchase
        </Button>
        <Button size="sm" variant="soft" onClick={() => navigate({ to: "/reports/$reportId", params: { reportId: "daily-statement" } })}>
          <TrendingUp /> Today's E-Statement
        </Button>
      </div>

      {/* Low Stock Alert Banner */}
      {stats.lowStockCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning-soft/60 px-4 py-3 text-warning">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
            <div className="text-sm">
              <span className="font-semibold text-foreground">
                {stats.lowStockCount} {stats.lowStockCount === 1 ? "medical supply requires" : "medical supplies require"} restocking:
              </span>{" "}
              <span className="text-muted-foreground">
                {stats.lowStockItems.map((p) => p.name).join(", ")}
              </span>
            </div>
          </div>
          <Button size="sm" variant="outline" className="border-warning/30 bg-surface shrink-0 hover:bg-warning-soft" asChild>
            <Link to="/stock">
              Review Inventory <ArrowRight />
            </Link>
          </Button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Today's Registered"
          value={stats.todayPatientsCount}
          icon={CalendarCheck}
          hint="Patients registered today"
        />
        <StatCard
          label="Today's Billing"
          value={formatINR(stats.todayBilled)}
          icon={ReceiptText}
          tone="teal"
          hint="Total billed today"
        />
        <StatCard
          label="Today's Collections"
          value={formatINR(stats.todayCollected)}
          icon={CreditCard}
          tone="success"
          hint="Cash / UPI / Card collected"
        />
        <StatCard
          label="Total Pending Dues"
          value={formatINR(stats.totalPending)}
          icon={IndianRupee}
          tone="danger"
          hint="Across all unpaid invoices"
          className="col-span-2 md:col-span-1"
        />
        <StatCard
          label="Low Stock Supplies"
          value={stats.lowStockCount}
          icon={Package}
          tone={stats.lowStockCount > 0 ? "warning" : "neutral"}
          hint="Items below threshold"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* 7-Day Revenue & Patient Volume Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="panel p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">7-Day Revenue & Collections Trend</h3>
              <p className="text-xs text-muted-foreground">Daily comparison of billed revenue vs cash/digital collections</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" /> Billed (₹)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-teal" /> Collected (₹)
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val: number) => [`₹${val.toLocaleString("en-IN")}`, undefined]}
                  labelStyle={{ fontWeight: "bold", color: "var(--color-foreground)" }}
                  contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "6px" }}
                />
                <Bar dataKey="billing" name="Billed" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={18} />
                <Bar dataKey="collections" name="Collected" fill="var(--color-teal)" radius={[4, 4, 0, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="panel p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">7-Day Patient Volume</h3>
              <p className="text-xs text-muted-foreground">Unique patients tested per day</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">Patients / day</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="label" tickLine={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
                <YAxis tickLine={false} tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" allowDecimals={false} />
                <Tooltip
                  formatter={(val: number) => [val, "Patients"]}
                  labelStyle={{ fontWeight: "bold", color: "var(--color-foreground)" }}
                  contentStyle={{ backgroundColor: "var(--color-surface)", borderColor: "var(--color-border)", borderRadius: "6px" }}
                />
                <Area type="monotone" dataKey="patients" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#patientGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Bills & Recent Patients */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Invoices</h3>
              <p className="text-xs text-muted-foreground">Latest bills and test orders</p>
            </div>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/billing">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentBills.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to="/billing/$billId" params={{ billId: b.id }} className="id-chip font-medium hover:text-primary">
                      {b.id}
                    </Link>
                    <PaymentStatusBadge status={b.status} />
                  </div>
                  <p className="mt-1 truncate text-xs font-medium text-foreground">{b.patientName}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(b.createdAt)} • {b.testCount} {b.testCount === 1 ? "test" : "tests"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="num text-sm font-semibold text-foreground">{formatINR(b.total)}</p>
                  {b.pending > 0 ? (
                    <p className="num text-xs text-danger font-medium">Due: {formatINR(b.pending)}</p>
                  ) : (
                    <p className="num text-xs text-success font-medium">Fully Paid</p>
                  )}
                  <Link to="/billing/$billId" params={{ billId: b.id }} className="mt-1 inline-block text-[11px] text-primary hover:underline">
                    Receipt →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Patients */}
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Recent Patients</h3>
              <p className="text-xs text-muted-foreground">Registered patients and visitation record</p>
            </div>
            <Button size="sm" variant="ghost" asChild>
              <Link to="/patients">
                View all <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="divide-y divide-border">
            {recentPatients.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3.5 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link to="/patients/$patientId" params={{ patientId: p.id }} className="id-chip font-medium hover:text-primary">
                      {p.id}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      {p.gender}, {p.age} yrs
                    </span>
                  </div>
                  <Link to="/patients/$patientId" params={{ patientId: p.id }} className="mt-1 block truncate text-xs font-semibold text-foreground hover:text-primary">
                    {p.name}
                  </Link>
                  <p className="num text-[11px] text-muted-foreground">{maskMobile(p.mobile)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {p.outstanding > 0 && (
                    <span className="num text-xs font-medium text-danger mr-1">
                      Due: {formatINR(p.outstanding)}
                    </span>
                  )}
                  <Button size="sm" variant="soft" asChild>
                    <Link to="/billing/new" search={{ patientId: p.id }}>
                      <ReceiptText /> Bill
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
