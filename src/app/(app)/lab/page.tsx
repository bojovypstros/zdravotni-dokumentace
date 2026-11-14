import { AppShell } from "@/components/app-shell/app-shell";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { LabPanelsView } from "@/components/lab/lab-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listLabPanels } from "@/server/services/lab";

export const instant = false;
export const metadata = { title: "Laboratoř" };

export default async function LabPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Laboratoř">
        <NoPatientState />
      </AppShell>
    );
  }

  const panels = await listLabPanels({ patientId: patient.id });

  return (
    <AppShell title="Laboratoř">
      <div className="mx-auto max-w-4xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Lab panely a výsledky analytů. Referenční intervaly patří ke
          konkrétnímu výsledku. Označení mimo meze se odvozuje jen z dodaného
          intervalu — bez diagnostiky.
        </p>
        <LabPanelsView
          patientId={patient.id}
          timeZone={patient.timezone}
          panels={panels}
        />
      </div>
    </AppShell>
  );
}
