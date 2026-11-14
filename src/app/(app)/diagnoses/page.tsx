import { AppShell } from "@/components/app-shell/app-shell";
import { DiagnosesAllergiesPanel } from "@/components/diagnosis/diagnoses-allergies-panel";
import { listAllergies } from "@/server/services/allergy";
import { listDiagnoses } from "@/server/services/diagnosis";
import { listPatients } from "@/server/services/patient";


export const instant = false;
export const metadata = { title: "Diagnózy a alergie" };

export default async function DiagnosesPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Diagnózy a alergie">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
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
