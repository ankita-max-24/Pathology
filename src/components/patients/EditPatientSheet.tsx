import { toast } from "sonner";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLab } from "@/lib/lab/store";
import type { Patient } from "@/lib/lab/types";

import { PatientForm } from "./PatientForm";

export function EditPatientSheet({ patient, onOpenChange }: { patient: Patient | null; onOpenChange: (o: boolean) => void }) {
  const { updatePatient } = useLab();
  return (
    <Sheet open={!!patient} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader className="mb-6">
          <SheetTitle>Edit patient</SheetTitle>
          <SheetDescription>
            <span className="id-chip">{patient?.id}</span> · Update registration details
          </SheetDescription>
        </SheetHeader>
        {patient && (
          <PatientForm
            key={patient.id}
            initial={{ ...patient }}
            submitLabel="Save changes"
            onCancel={() => onOpenChange(false)}
            onSubmit={(v) => {
              updatePatient(patient.id, v);
              toast.success("Patient details updated");
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
