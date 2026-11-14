import { AppShell } from "@/components/app-shell/app-shell";
import { VitalsPanel } from "@/components/observation/vitals-panel";
import { requireChartPatient } from "@/lib/auth/active-patient";
import { canManageClinicalCatalog } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { listObservations } from "@/server/services/observation";
import { listDefinitionsForPatient } from "@/server/services/observation-definition";

export const instant = false;
export const metadata = { title: "Vitální funkce" };

export default async function ObservationsPage() {
  const [session, patient] = await Promise.all([
    requireSession(),
    requireChartPatient(),
  ]);

  const [definitions, observations] = await Promise.all([
    listDefinitionsForPatient(patient.id),
    listObservations({ patientId: patient.id }),
  ]);

  return (
    <AppShell
      title="Vitální funkce"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
    >
      <div className="mx-auto max-w-4xl">
        <VitalsPanel
          patientId={patient.id}
          timeZone={patient.timezone}
          definitions={definitions}
          observations={observations}
          canManageCatalog={canManageClinicalCatalog(session.user.role)}
        />
      </div>
    </AppShell>
  );
}
