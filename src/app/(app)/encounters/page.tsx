import { AppShell } from "@/components/app-shell/app-shell";
import { EncountersPanel } from "@/components/encounter/encounters-panel";
import { listEncounters } from "@/server/services/encounter";
import { listPatients } from "@/server/services/patient";

export const instant = false;
export const metadata = { title: "Události" };

export default async function EncountersPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Události / pobyty">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
      </AppShell>
    );
  }

  const encounters = await listEncounters({ patientId: patient.id });

  return (
    <AppShell title="Události / pobyty">
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Kontextové pobyty a epizody (hospitalizace, ambulance, urgentní,
          vlastní sledování). Více pacientů / kartotéka = Fáze 10.
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
