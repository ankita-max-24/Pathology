import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ReceiptText, UserRound } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { findDuplicates } from "@/components/patients/duplicates";
import { PatientForm } from "@/components/patients/PatientForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate, maskMobile } from "@/lib/lab/format";
import { useLab, type PatientInput } from "@/lib/lab/store";
import type { Patient } from "@/lib/lab/types";

export const Route = createFileRoute("/patients/new")({
  validateSearch: (s: Record<string, unknown>): { next?: "billing" } => (s["next"] === "billing" ? { next: "billing" } : {}),
  head: () => ({
    meta: [
      { title: "Register Patient — GNS Pathology Lab" },
      { name: "description", content: "Register a new laboratory patient with automatic patient ID and duplicate check." },
      { property: "og:title", content: "Register Patient — GNS Pathology Lab" },
      { property: "og:description", content: "Register a new laboratory patient with automatic patient ID and duplicate check." },
    ],
  }),
  component: RegisterPatientPage,
});

function RegisterPatientPage() {
  const { db, patients, addPatient } = useLab();
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [pending, setPending] = useState<PatientInput | null>(null);
  const [dupes, setDupes] = useState<Patient[]>([]);
  const [created, setCreated] = useState<Patient | null>(null);
  const [formKey, setFormKey] = useState(0);

  const create = (v: PatientInput) => {
    const p = addPatient(v);
    setPending(null);
    setDupes([]);
    toast.success(`Patient registered — ${p.id}`);
    if (next === "billing") {
      navigate({ to: "/billing/new", search: { patientId: p.id } });
      return;
    }
    setCreated(p);
  };

  const onSubmit = (v: PatientInput) => {
    const matches = findDuplicates(v, db.patients);
    if (matches.length > 0) {
      setPending(v);
      setDupes(matches);
      return;
    }
    create(v);
  };

  const lastVisit = (id: string) => patients.find((p) => p.id === id)?.lastVisit ?? "";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Register Patient"
        subtitle="A unique patient ID is generated automatically when the record is saved."
        crumbs={[{ label: "Dashboard", to: "/" }, { label: "Patients", to: "/patients" }, { label: "Register" }]}
      />

      {created ? (
        <div className="panel flex flex-col items-center px-6 py-12 text-center">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="text-lg font-semibold">Patient registered successfully</h2>
          <p className="mt-1 text-sm text-muted-foreground">{created.name}</p>
          <p className="id-chip mt-2 rounded-md bg-muted px-2.5 py-1 text-sm text-foreground">{created.id}</p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" asChild>
              <Link to="/patients/$patientId" params={{ patientId: created.id }}>
                <UserRound /> View Account
              </Link>
            </Button>
            <Button asChild>
              <Link to="/billing/new" search={{ patientId: created.id }}>
                <ReceiptText /> Start Billing
              </Link>
            </Button>
          </div>
          <button
            type="button"
            className="mt-6 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => {
              setCreated(null);
              setFormKey((k) => k + 1);
            }}
          >
            Register another patient
          </button>
        </div>
      ) : (
        <div className="panel p-5 md:p-6">
          <PatientForm key={formKey} submitLabel="Register Patient" onSubmit={onSubmit} onCancel={() => navigate({ to: "/patients" })} />
        </div>
      )}

      <Dialog open={dupes.length > 0} onOpenChange={(o) => !o && setDupes([])}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Possible Existing Patient</DialogTitle>
            <DialogDescription>A patient with the same name or mobile number is already registered. Please confirm before creating a new record.</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-border rounded-md border border-border">
            {dupes.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <p className="font-medium">{d.name}</p>
                  <p className="id-chip">
                    {d.id} · {maskMobile(d.mobile)} · Last visit {formatDate(lastVisit(d.id))}
                  </p>
                </div>
                <Button size="sm" variant="soft" asChild>
                  <Link to="/patients/$patientId" params={{ patientId: d.id }}>Open Existing Patient</Link>
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDupes([])}>Back to form</Button>
            <Button onClick={() => pending && create(pending)}>Continue Registration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
