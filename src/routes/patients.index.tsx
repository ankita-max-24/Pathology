import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, IndianRupee, Pencil, ReceiptText, Repeat, UserPlus, Users, UserRoundCheck, CalendarCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { DataTable, type Column } from "@/components/common/DataTable";
import { DateRangeFilter, rangeFromPreset, type DateRange } from "@/components/common/DateRangeFilter";
import { PageHeader } from "@/components/common/PageHeader";
import { SearchInput } from "@/components/common/SearchInput";
import { StatCard } from "@/components/common/StatCard";
import { EditPatientSheet } from "@/components/patients/EditPatientSheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCSV } from "@/lib/lab/export";
import { formatDate, formatINR, maskMobile, todayKey } from "@/lib/lab/format";
import type { PatientView } from "@/lib/lab/selectors";
import { useLab } from "@/lib/lab/store";
import type { Patient } from "@/lib/lab/types";

export const Route = createFileRoute("/patients/")({
  head: () => ({
    meta: [
      { title: "Patients — GNS Pathology Lab" },
      { name: "description", content: "Search registered patients, view accounts, visits and outstanding balances." },
      { property: "og:title", content: "Patients — GNS Pathology Lab" },
      { property: "og:description", content: "Search registered patients, view accounts, visits and outstanding balances." },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const { patients, bills, db } = useLab();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [range, setRange] = useState<DateRange>(rangeFromPreset("all"));
  const [gender, setGender] = useState("all");
  const [type, setType] = useState("all");
  const [editing, setEditing] = useState<Patient | null>(null);

  const today = todayKey();
  const monthStart = rangeFromPreset("month").from;
  const stats = useMemo(() => {
    const todays = new Set(bills.filter((b) => b.dateKey === today).map((b) => b.patientId));
    return {
      total: patients.length,
      newThisMonth: patients.filter((p) => p.registeredKey >= monthStart).length,
      returning: patients.filter((p) => p.visits > 1).length,
      today: todays.size,
      outstanding: patients.reduce((s, p) => s + p.outstanding, 0),
    };
  }, [patients, bills, today, monthStart]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return patients.filter((p) => {
      if (term && !(p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.mobile.includes(term))) return false;
      if (p.registeredKey < range.from || p.registeredKey > range.to) return false;
      if (gender !== "all" && p.gender !== gender) return false;
      if (type === "new" && p.visits > 1) return false;
      if (type === "returning" && p.visits <= 1) return false;
      if (type === "outstanding" && p.outstanding <= 0) return false;
      return true;
    });
  }, [patients, q, range, gender, type]);

  const columns: Column<PatientView>[] = [
    { key: "id", header: "Patient ID", cell: (p) => <span className="id-chip">{p.id}</span>, sortValue: (p) => p.id },
    {
      key: "name",
      header: "Patient Name",
      cell: (p) => (
        <Link to="/patients/$patientId" params={{ patientId: p.id }} className="font-medium text-foreground hover:text-primary">
          {p.name}
        </Link>
      ),
      sortValue: (p) => p.name,
    },
    { key: "age", header: "Age", cell: (p) => <span className="num">{p.age}</span>, sortValue: (p) => p.age, align: "right" },
    { key: "gender", header: "Gender", cell: (p) => p.gender },
    { key: "mobile", header: "Mobile", cell: (p) => <span className="num">{maskMobile(p.mobile)}</span> },
    { key: "reg", header: "Registered", cell: (p) => formatDate(p.createdAt), sortValue: (p) => p.createdAt },
    { key: "visits", header: "Visits", cell: (p) => <span className="num">{p.visits}</span>, sortValue: (p) => p.visits, align: "right" },
    { key: "tests", header: "Tests", cell: (p) => <span className="num">{p.totalTests}</span>, sortValue: (p) => p.totalTests, align: "right" },
    { key: "billed", header: "Total Billed", cell: (p) => <span className="num">{formatINR(p.billed)}</span>, sortValue: (p) => p.billed, align: "right" },
    { key: "paid", header: "Paid", cell: (p) => <span className="num">{formatINR(p.paid)}</span>, sortValue: (p) => p.paid, align: "right" },
    {
      key: "out",
      header: "Outstanding",
      cell: (p) => <span className={p.outstanding > 0 ? "num font-medium text-danger" : "num text-muted-foreground"}>{formatINR(p.outstanding)}</span>,
      sortValue: (p) => p.outstanding,
      align: "right",
    },
    { key: "last", header: "Last Visit", cell: (p) => (p.lastVisit ? formatDate(p.lastVisit) : <span className="text-muted-foreground">—</span>), sortValue: (p) => p.lastVisit },
    
    
    // {
    //   key: "actions",
    //   header: "",
    //   align: "right",
    //   cell: (p) => (
    //     <div className="flex justify-end gap-1">
    //       <Button size="sm" variant="ghost" asChild>
    //         <Link to="/patients/$patientId" params={{ patientId: p.id }}>View</Link>
    //       </Button>
    //       <Button size="sm" variant="soft" asChild>
    //         <Link to="/billing/new" search={{ patientId: p.id }}>
    //           <ReceiptText /> Bill
    //         </Link>
    //       </Button>
    //       <Button size="icon-sm" variant="ghost" aria-label={`Edit ${p.name}`} onClick={() => setEditing(db.patients.find((x) => x.id === p.id) ?? null)}>
    //         <Pencil />
    //       </Button>
    //     </div>
    //   ),
    // },
  ];

  const doExport = () =>
    exportCSV(
      `patients-${today}.csv`,
      ["Patient ID", "Name", "Age", "Gender", "Mobile", "Registered", "Visits", "Tests", "Billed", "Paid", "Outstanding", "Last Visit"],
      rows.map((p) => [p.id, p.name, p.age, p.gender, p.mobile, formatDate(p.createdAt), p.visits, p.totalTests, p.billed, p.paid, p.outstanding, p.lastVisit ? formatDate(p.lastVisit) : ""]),
    );

  return (
    <div>
      <PageHeader
        title="Patients"
        subtitle="All registered patients with visits, billing and outstanding balances."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Patients" }]}
        actions={
          <>
            <Button variant="outline" onClick={doExport}>
              <Download /> Export
            </Button>
            <Button onClick={() => navigate({ to: "/patients/new" })}>
              <UserPlus /> Register Patient
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Total Registered" value={stats.total} icon={Users} />
        <StatCard label="New This Month" value={stats.newThisMonth} icon={UserPlus} tone="teal" />
        <StatCard label="Returning Patients" value={stats.returning} icon={Repeat} tone="neutral" />
        <StatCard label="Today's Patients" value={stats.today} icon={CalendarCheck} tone="success" />
        <StatCard label="Outstanding Amount" value={formatINR(stats.outstanding)} icon={IndianRupee} tone="danger" className="col-span-2 md:col-span-1" />
      </div>

      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-3 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={setQ} placeholder="Search by name, patient ID or mobile…" className="lg:w-80" />
          <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
            <DateRangeFilter value={range} onChange={setRange} presets={["all", "today", "week", "month", "custom"]} />
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="h-9 w-[120px] bg-surface" aria-label="Gender"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-[150px] bg-surface" aria-label="Patient type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All patients</SelectItem>
                <SelectItem value="new">New patients</SelectItem>
                <SelectItem value="returning">Returning</SelectItem>
                <SelectItem value="outstanding">With outstanding</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(p) => p.id}
          initialSort={{ key: "id", dir: "desc" }}
          emptyTitle="No patients match your search"
          emptyDescription="Try a different name, ID or mobile number, or register a new patient."
          emptyAction={
            <Button size="sm" onClick={() => navigate({ to: "/patients/new" })}>
              <UserRoundCheck /> Register Patient
            </Button>
          }
        />
      </div>

      <EditPatientSheet patient={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}
