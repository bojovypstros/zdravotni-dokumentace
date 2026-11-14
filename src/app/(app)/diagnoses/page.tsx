import { AppShell } from "@/components/app-shell/app-shell";
import { DiagnosesAllergiesPanel } from "@/components/diagnosis/diagnoses-allergies-panel";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listAllergies } from "@/server/services/allergy";
import { listDiagnoses } from "@/server/services/diagnosis";

export const instant = false;
export const metadata = { title: "Diagnózy a alergie" };

export default async function DiagnosesPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Diagnózy a alergie">
        <NoPatientState />
      </AppShell>
    );
  }

  const [diagnoses, allergies] = await Promise.all([
    listDiagnoses(patient.id),
    listAllergies(patient.id),
  ]);

  return (
    <AppShell title="Diagnózy a alergie">
      <div className="mx-auto max-w-3xl">
        <DiagnosesAllergiesPanel
          patientId={patient.id}
          noKnownAllergies={patient.noKnownAllergies}
          diagnoses={diagnoses}
          allergies={allergies}
        />
      </div>
    </AppShell>
  );
}
