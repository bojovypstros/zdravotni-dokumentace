import { AppShell } from "@/components/app-shell/app-shell";
import { VitalsPanel } from "@/components/observation/vitals-panel";
import { listObservations } from "@/server/services/observation";
import { listDefinitionsForPatient } from "@/server/services/observation-definition";
import { listPatients } from "@/server/services/patient";

export const instant = false;
export const metadata = { title: "Vitální funkce" };

export default async function ObservationsPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Vitální funkce">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
      </AppShell>
    );
  }

  const [definitions, observations] = await Promise.all([
    listDefinitionsForPatient(patient.id),
    listObservations({ patientId: patient.id }),
  ]);

  return (
    <AppShell title="Vitální funkce">
      <div className="mx-auto max-w-4xl">
        <VitalsPanel
          patientId={patient.id}
          timeZone={patient.timezone}
          definitions={definitions}
          observations={observations}
        />
      </div>
    </AppShell>
  );
}
