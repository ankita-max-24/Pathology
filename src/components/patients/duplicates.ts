import type { PatientInput } from "@/lib/lab/store";
import type { Patient } from "@/lib/lab/types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** Possible duplicates: same mobile, or same normalised name. */
export function findDuplicates(input: Pick<PatientInput, "name" | "mobile">, patients: Patient[], excludeId?: string): Patient[] {
  const name = norm(input.name);
  return patients.filter((p) => p.id !== excludeId && ((input.mobile && p.mobile === input.mobile) || (name.length > 2 && norm(p.name) === name)));
}
