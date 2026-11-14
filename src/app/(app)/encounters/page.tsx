import { AppShell } from "@/components/app-shell/app-shell";
import { EncountersPanel } from "@/components/encounter/encounters-panel";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listEncounters } from "@/server/services/encounter";

export const instant = false;
export const metadata = { title: "Události" };

export default async function EncountersPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Události / pobyty">
        <NoPatientState />
      </AppShell>
    );
  }

  const encounters = await listEncounters({ patientId: patient.id });

  return (
    <AppShell title="Události / pobyty">
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Kontextové pobyty a epizody (hospitalizace, ambulance, urgentní,
          vlastní sledování). Aktivní pacient z kartotéky.
        </p>
        <EncountersPanel
          patientId={patient.id}
          timeZone={patient.timezone}
          encounters={encounters}
        />
      </div>
    </AppShell>
  );
}
