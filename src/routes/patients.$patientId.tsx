import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CreditCard,
  FileText,
  IndianRupee,
  MapPin,
  Pencil,
  Phone,
  PlusCircle,
  ReceiptText,
  Stethoscope,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { PaymentStatusBadge } from "@/components/common/StatusBadge";
import { EditPatientSheet } from "@/components/patients/EditPatientSheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatDateTime, formatINR, maskMobile } from "@/lib/lab/format";
import type { BillView } from "@/lib/lab/selectors";
import { useLab } from "@/lib/lab/store";
import type { Payment } from "@/lib/lab/types";

export const Route = createFileRoute("/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient Account — GNS Pathology Lab" },
      { name: "description", content: "Patient account details, test history, billing records and payment ledger." },
      { property: "og:title", content: "Patient Account — GNS Pathology Lab" },
      { property: "og:description", content: "Patient account details, test history, billing records and payment ledger." },
    ],
  }),
  component: PatientAccountPage,
});

function PatientAccountPage() {
  const { patientId } = Route.useParams();
  const { patients, bills, db } = useLab();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Find patient
  const patient = useMemo(() => patients.find((p) => p.id === patientId), [patients, patientId]);
  const rawPatient = useMemo(() => db.patients.find((p) => p.id === patientId), [db.patients, patientId]);

  // Bills for this patient
  const patientBills = useMemo(
    () => bills.filter((b) => b.patientId === patientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [bills, patientId],
  );

  // Payments for this patient
  const patientPayments = useMemo(
    () => db.payments.filter((p) => p.patientId === patientId).sort((a, b) => b.date.localeCompare(a.date)),
    [db.payments, patientId],
  );

  if (!patient || !rawPatient) {
    return (
      <div className="space-y-6">
        <PageHeader title="Patient Not Found" crumbs={[{ label: "Patients", to: "/patients" }, { label: "Unknown" }]} />
        <div className="panel p-12 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-danger" />
          <h2 className="mt-4 text-base font-semibold text-foreground">Patient Record Not Found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No patient with identifier <span className="font-mono">{patientId}</span> exists in the database.
          </p>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link to="/patients">
                <ArrowLeft /> Back to Patients
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Columns for Billing History tab
  const billColumns: Column<BillView>[] = [
    {
      key: "id",
      header: "Invoice ID",
      cell: (b) => (
        <Link to="/billing/$billId" params={{ billId: b.id }} className="id-chip font-medium hover:text-primary">
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
      key: "items",
      header: "Tests Ordered",
      cell: (b) => (
        <div className="max-w-[280px]">
          <span className="font-medium text-xs text-foreground">
            {b.items.map((i) => i.name).join(", ")}
          </span>
          <span className="text-[11px] text-muted-foreground block">
            ({b.testCount} {b.testCount === 1 ? "item" : "items"})
          </span>
        </div>
      ),
    },
    {
      key: "subtotal",
      header: "Subtotal",
      align: "right",
      cell: (b) => <span className="num">{formatINR(b.subtotal)}</span>,
    },
    {
      key: "discount",
      header: "Discount",
      align: "right",
      cell: (b) => <span className="num">{b.discountAmount > 0 ? formatINR(b.discountAmount) : "—"}</span>,
    },
    {
      key: "total",
      header: "Net Total",
      align: "right",
      cell: (b) => <span className="num font-semibold text-foreground">{formatINR(b.total)}</span>,
      sortValue: (b) => b.total,
    },
    {
      key: "paid",
      header: "Paid",
      align: "right",
      cell: (b) => <span className="num text-success font-medium">{formatINR(b.paid)}</span>,
      sortValue: (b) => b.paid,
    },
    {
      key: "pending",
      header: "Balance Due",
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
    },
    {
      key: "action",
      header: "",
      align: "right",
      cell: (b) => (
        <Button size="sm" variant="ghost" asChild>
          <Link to="/billing/$billId" params={{ billId: b.id }}>
            <FileText className="h-3.5 w-3.5 mr-1" /> View Receipt
          </Link>
        </Button>
      ),
    },
  ];

  // Columns for Payment Ledger tab
  const paymentColumns: Column<Payment>[] = [
    {
      key: "id",
      header: "Receipt #",
      cell: (p) => <span className="id-chip">{p.id}</span>,
      sortValue: (p) => p.id,
    },
    {
      key: "date",
      header: "Transaction Date & Time",
      cell: (p) => formatDateTime(p.date),
      sortValue: (p) => p.date,
    },
    {
      key: "billId",
      header: "Against Invoice",
      cell: (p) => (
        <Link to="/billing/$billId" params={{ billId: p.billId }} className="id-chip hover:text-primary">
          {p.billId}
        </Link>
      ),
    },
    {
      key: "mode",
      header: "Payment Mode",
      cell: (p) => (
        <span className="inline-flex items-center gap-1.5 rounded bg-muted px-2 py-0.5 text-xs font-medium text-foreground">
          <CreditCard className="h-3 w-3" /> {p.mode}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference / Transaction ID",
      cell: (p) => (p.reference ? <span className="font-mono text-xs">{p.reference}</span> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: "amount",
      header: "Amount Paid",
      align: "right",
      cell: (p) => <span className="num font-semibold text-success">{formatINR(p.amount)}</span>,
      sortValue: (p) => p.amount,
    },
    {
      key: "action",
      header: "",
      align: "right",
      cell: (p) => (
        <Button size="sm" variant="ghost" asChild>
          <Link to="/billing/$billId" params={{ billId: p.billId }}>
            Bill
          </Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={patient.name}
        subtitle={`Patient ID: ${patient.id} • Registered ${formatDate(patient.createdAt)}`}
        crumbs={[
          { label: "Dashboard", to: "/" },
          { label: "Patients", to: "/patients" },
          { label: patient.name },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Edit Profile
            </Button>
            <Button asChild>
              <Link to="/billing/new" search={{ patientId: patient.id }}>
                <PlusCircle className="h-4 w-4" /> New Bill
              </Link>
            </Button>
          </div>
        }
      />

      {/* Patient Header Card */}
      <div className="panel p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary font-bold text-lg">
              {patient.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{patient.name}</h2>
                <span className="id-chip rounded bg-muted px-2 py-0.5 font-medium">{patient.id}</span>
                <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">
                  {patient.gender}, {patient.age} yrs
                </span>
                {patient.outstanding > 0 ? (
                  <span className="rounded bg-danger-soft px-2.5 py-0.5 text-xs font-semibold text-danger">
                    Balance Due: {formatINR(patient.outstanding)}
                  </span>
                ) : (
                  <span className="rounded bg-success-soft px-2.5 py-0.5 text-xs font-semibold text-success">
                    No Dues
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  <span className="num font-medium text-foreground">{maskMobile(patient.mobile)}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>
                    {patient.address ? `${patient.address}, ` : ""}
                    {patient.city || "Raipur"}, {patient.state || "Chhattisgarh"} {patient.pin ? `- ${patient.pin}` : ""}
                  </span>
                </span>
                {patient.referringDoctor && (
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-teal" />
                    <span>Ref: <strong className="font-medium text-foreground">{patient.referringDoctor}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 border-t border-border pt-4 md:border-t-0 md:pt-0">
            <div className="text-right">
              <span className="eyebrow block">Total Billed</span>
              <span className="num text-base font-bold text-foreground">{formatINR(patient.billed)}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <span className="eyebrow block">Total Paid</span>
              <span className="num text-base font-bold text-success">{formatINR(patient.paid)}</span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-right">
              <span className="eyebrow block">Due Balance</span>
              <span className={`num text-base font-bold ${patient.outstanding > 0 ? "text-danger" : "text-muted-foreground"}`}>
                {formatINR(patient.outstanding)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Operational Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="billing">
            Billing History ({patientBills.length})
          </TabsTrigger>
          <TabsTrigger value="payments">
            Payment Ledger ({patientPayments.length})
          </TabsTrigger>
          <TabsTrigger value="details">Patient Details</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total Invoices" value={patientBills.length} icon={ReceiptText} />
            <StatCard label="Total Tests Conducted" value={patient.totalTests} icon={FileText} tone="teal" />
            <StatCard label="Total Amount Paid" value={formatINR(patient.paid)} icon={IndianRupee} tone="success" />
            <StatCard
              label="Pending Due"
              value={formatINR(patient.outstanding)}
              icon={IndianRupee}
              tone={patient.outstanding > 0 ? "danger" : "neutral"}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Recent Orders Timeline */}
            <div className="panel p-5">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground">Recent Test Visits</h3>
                <span className="text-xs text-muted-foreground">{patient.visits} total visits</span>
              </div>
              {patientBills.length === 0 ? (
                <p className="text-xs text-muted-foreground">No visits recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {patientBills.slice(0, 4).map((b) => (
                    <div key={b.id} className="relative flex gap-3 border-l-2 border-primary/30 pl-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <Link to="/billing/$billId" params={{ billId: b.id }} className="id-chip font-medium hover:text-primary">
                            {b.id}
                          </Link>
                          <span className="text-xs text-muted-foreground">{formatDate(b.createdAt)}</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-foreground">
                          {b.items.map((i) => i.name).join(", ")}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <PaymentStatusBadge status={b.status} />
                          <span className="num text-xs font-medium text-foreground">{formatINR(b.total)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Demographics & Notes Card */}
            <div className="panel p-5">
              <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-sm font-semibold text-foreground">Patient Information</h3>
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Age & Gender</span>
                  <span className="font-medium text-foreground">{patient.age} yrs / {patient.gender}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Date of Birth</span>
                  <span className="font-medium text-foreground">{patient.dob ? formatDate(patient.dob) : "Not recorded"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Mobile Number</span>
                  <span className="num font-medium text-foreground">{maskMobile(patient.mobile)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Referring Doctor</span>
                  <span className="font-medium text-foreground">{patient.referringDoctor || "Self / None"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block">Full Address</span>
                  <span className="font-medium text-foreground">
                    {[patient.address, patient.city, patient.state, patient.pin].filter(Boolean).join(", ") || "—"}
                  </span>
                </div>
                {patient.notes && (
                  <div className="col-span-2 mt-2 rounded bg-muted/60 p-2 text-muted-foreground">
                    <span className="font-semibold text-foreground">Clinical Notes: </span>
                    {patient.notes}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Billing History */}
        <TabsContent value="billing" className="panel overflow-hidden">
          <DataTable
            rows={patientBills}
            columns={billColumns}
            rowKey={(b) => b.id}
            initialSort={{ key: "date", dir: "desc" }}
            emptyTitle="No bills generated yet"
            emptyDescription="Generate a test invoice for this patient using the New Bill action."
            emptyAction={
              <Button size="sm" asChild>
                <Link to="/billing/new" search={{ patientId: patient.id }}>
                  <PlusCircle /> New Bill
                </Link>
              </Button>
            }
          />
        </TabsContent>

        {/* Tab 3: Payment Ledger */}
        <TabsContent value="payments" className="panel overflow-hidden">
          <DataTable
            rows={patientPayments}
            columns={paymentColumns}
            rowKey={(p) => p.id}
            initialSort={{ key: "date", dir: "desc" }}
            emptyTitle="No payment records"
            emptyDescription="Payments recorded against patient invoices will appear here."
          />
        </TabsContent>

        {/* Tab 4: Patient Details */}
        <TabsContent value="details" className="panel p-6">
          <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Full Patient Profile</h3>
              <p className="text-xs text-muted-foreground">Demographic, contact and registration data</p>
            </div>
            <Button onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1.5" /> Edit Details
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="eyebrow">Demographics & Identity</h4>
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Patient ID</span>
                  <span className="id-chip font-bold">{patient.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Full Name</span>
                  <span className="font-semibold text-foreground">{patient.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Age</span>
                  <span className="num font-medium text-foreground">{patient.age} years</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Gender</span>
                  <span className="font-medium text-foreground">{patient.gender}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium text-foreground">{patient.dob ? formatDate(patient.dob) : "Not recorded"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="eyebrow">Contact & Address</h4>
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Mobile Phone</span>
                  <span className="num font-medium text-foreground">{maskMobile(patient.mobile)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-foreground">{patient.address || "—"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">City</span>
                  <span className="font-medium text-foreground">{patient.city || "Raipur"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">State</span>
                  <span className="font-medium text-foreground">{patient.state || "Chhattisgarh"}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">PIN Code</span>
                  <span className="num font-medium text-foreground">{patient.pin || "—"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 md:col-span-2">
              <h4 className="eyebrow">Medical & System Records</h4>
              <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-4 text-xs">
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Referring Doctor</span>
                  <span className="font-medium text-foreground">{patient.referringDoctor || "Self / None"}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span className="text-muted-foreground">Registration Timestamp</span>
                  <span className="font-medium text-foreground">{formatDateTime(patient.createdAt)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Internal Notes</span>
                  <span className="font-medium text-foreground">{patient.notes || "None"}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit sheet */}
      <EditPatientSheet patient={rawPatient} onOpenChange={(open) => !open && setEditing(false)} />
    </div>
  );
}
