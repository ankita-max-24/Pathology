import { useEffect, useRef, useState, type FormEvent } from "react";

import { Field } from "@/components/common/Field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ageFromDob, isValidMobile } from "@/lib/lab/calculations";
import { todayKey } from "@/lib/lab/format";
import type { PatientInput } from "@/lib/lab/store";
import type { Gender } from "@/lib/lab/types";

export const EMPTY_PATIENT: PatientInput = {
  name: "",
  dob: "",
  age: 0,
  gender: "Male",
  mobile: "",
  address: "",
  city: "Raipur",
  state: "Chhattisgarh",
  pin: "",
  referringDoctor: "",
  notes: "",
};

type Errors = Partial<Record<keyof PatientInput, string>>;

export function validatePatient(v: PatientInput): Errors {
  const e: Errors = {};
  if (v.name.trim().length < 2) e.name = "Enter the patient's full name";
  if (!v.age || v.age < 0 || v.age > 120) e.age = "Enter a valid age (0–120)";
  if (!isValidMobile(v.mobile)) e.mobile = "Enter a valid 10-digit mobile number";
  if (v.pin && !/^\d{6}$/.test(v.pin)) e.pin = "PIN code must be 6 digits";
  if (v.dob && v.dob > todayKey()) e.dob = "Date of birth cannot be in the future";
  return e;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-b border-border pb-6 last:border-b-0 last:pb-0 sm:grid-cols-2">
      <legend className="eyebrow mb-4 sm:col-span-2">{title}</legend>
      {children}
    </fieldset>
  );
}

export function PatientForm({
  initial = EMPTY_PATIENT,
  submitLabel,
  onSubmit,
  onCancel,
  busy,
}: {
  initial?: PatientInput;
  submitLabel: string;
  onSubmit: (v: PatientInput) => void;
  onCancel?: () => void;
  busy?: boolean;
}) {
  const [v, setV] = useState<PatientInput>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof PatientInput, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const errors = validatePatient(v);
  const show = (k: keyof PatientInput) => (submitted || touched[k] ? errors[k] : undefined);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const set = <K extends keyof PatientInput>(k: K, val: PatientInput[K]) => setV((p) => ({ ...p, [k]: val }));
  const blur = (k: keyof PatientInput) => () => setTouched((t) => ({ ...t, [k]: true }));

  const onDob = (dob: string) => {
    const age = ageFromDob(dob);
    setV((p) => ({ ...p, dob, age: age ?? p.age }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    onSubmit({ ...v, name: v.name.trim().replace(/\s+/g, " "), mobile: v.mobile.replace(/\s/g, "") });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <Section title="Basic details">
        <Field label="Full Name" htmlFor="p-name" required error={show("name")} className="sm:col-span-2">
          <Input id="p-name" ref={nameRef} value={v.name} onChange={(e) => set("name", e.target.value)} onBlur={blur("name")} placeholder="e.g. Rahul Sharma" autoComplete="off" />
        </Field>
        <Field label="Date of Birth" htmlFor="p-dob" error={show("dob")} hint="Age is calculated automatically">
          <Input id="p-dob" type="date" max={todayKey()} value={v.dob} onChange={(e) => onDob(e.target.value)} onBlur={blur("dob")} />
        </Field>
        <Field label="Age (years)" htmlFor="p-age" required error={show("age")} hint={v.dob ? "From date of birth" : "Enter manually if DOB is unknown"}>
          <Input id="p-age" type="number" min={0} max={120} inputMode="numeric" value={v.age || ""} readOnly={!!v.dob && ageFromDob(v.dob) !== null} onChange={(e) => set("age", Number(e.target.value))} onBlur={blur("age")} className="num read-only:bg-muted" />
        </Field>
        <Field label="Gender" required>
          <Select value={v.gender} onValueChange={(g) => set("gender", g as Gender)}>
            <SelectTrigger aria-label="Gender"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Mobile Number" htmlFor="p-mobile" required error={show("mobile")}>
          <div className="flex">
            <span className="flex items-center rounded-l-md border border-r-0 border-input bg-muted px-2.5 text-sm text-muted-foreground">+91</span>
            <Input id="p-mobile" inputMode="numeric" maxLength={10} value={v.mobile} onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))} onBlur={blur("mobile")} placeholder="98XXXXXXXX" className="num rounded-l-none" />
          </div>
        </Field>
      </Section>

      <Section title="Contact details">
        <Field label="Address" htmlFor="p-address" className="sm:col-span-2">
          <Input id="p-address" value={v.address} onChange={(e) => set("address", e.target.value)} placeholder="House no., street, locality" />
        </Field>
        <Field label="City" htmlFor="p-city">
          <Input id="p-city" value={v.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="State" htmlFor="p-state">
            <Input id="p-state" value={v.state} onChange={(e) => set("state", e.target.value)} />
          </Field>
          <Field label="PIN Code" htmlFor="p-pin" error={show("pin")}>
            <Input id="p-pin" inputMode="numeric" maxLength={6} value={v.pin} onChange={(e) => set("pin", e.target.value.replace(/\D/g, ""))} onBlur={blur("pin")} className="num" />
          </Field>
        </div>
      </Section>

      <Section title="Additional details">
        <Field label="Referring Doctor" htmlFor="p-doc">
          <Input id="p-doc" value={v.referringDoctor} onChange={(e) => set("referringDoctor", e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Notes" htmlFor="p-notes" className="sm:col-span-2">
          <Textarea id="p-notes" rows={2} value={v.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional" />
        </Field>
      </Section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
