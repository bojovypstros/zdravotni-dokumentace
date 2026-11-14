import { AppShell } from "@/components/app-shell/app-shell";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { SymptomsDiaryPanel } from "@/components/symptom/symptoms-diary-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listClinicalNotes } from "@/server/services/clinical-note";
import {
  listDiaryScaleReadings,
  listPatientDiaryScales,
} from "@/server/services/diary-scale";
import { listSymptomEntries } from "@/server/services/symptom";

export const instant = false;
export const metadata = { title: "Symptomy a deník" };

export default async function SymptomsPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Symptomy a deník">
        <NoPatientState />
      </AppShell>
    );
  }

  const [scales, readings, symptoms, notes] = await Promise.all([
    listPatientDiaryScales(patient.id),
    listDiaryScaleReadings({ patientId: patient.id }),
    listSymptomEntries({ patientId: patient.id }),
    listClinicalNotes({ patientId: patient.id }),
  ]);

  return (
    <AppShell title="Symptomy a deník">
      <div className="mx-auto max-w-4xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Plný symptom deník včetně konfigurovatelných škál (nálada, úzkost,
          energie…) a klinických poznámek. Korekce = update in place + audit.
        </p>
        <SymptomsDiaryPanel
          patientId={patient.id}
          timeZone={patient.timezone}
          scales={scales}
          readings={readings}
          symptoms={symptoms}
          notes={notes}
        />
      </div>
    </AppShell>
  );
}
