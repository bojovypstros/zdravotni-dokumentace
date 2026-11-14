import { AppShell } from "@/components/app-shell/app-shell";
import { EncountersPanel } from "@/components/encounter/encounters-panel";
import { requireChartPatient } from "@/lib/auth/active-patient";
import { listEncounters } from "@/server/services/encounter";

export const instant = false;
export const metadata = { title: "Události" };

export default async function EncountersPage() {
  const patient = await requireChartPatient();
  const encounters = await listEncounters({ patientId: patient.id });

  return (
    <AppShell
      title="Události / pobyty"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
      patientArchivedAt={patient.archivedAt}
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Kontextové pobyty a epizody (hospitalizace, ambulance, urgentní,
          vlastní sledování).
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
