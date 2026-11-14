import { AppShell } from "@/components/app-shell/app-shell";
import { SymptomsDiaryPanel } from "@/components/symptom/symptoms-diary-panel";
import { listClinicalNotes } from "@/server/services/clinical-note";
import {
  listDiaryScaleReadings,
  listPatientDiaryScales,
} from "@/server/services/diary-scale";
import { listPatients } from "@/server/services/patient";
import { listSymptomEntries } from "@/server/services/symptom";

export const instant = false;
export const metadata = { title: "Symptomy a deník" };

export default async function SymptomsPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Symptomy a deník">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
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
