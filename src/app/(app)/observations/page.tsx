import { AppShell } from "@/components/app-shell/app-shell";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { VitalsPanel } from "@/components/observation/vitals-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { canManageClinicalCatalog } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { listObservations } from "@/server/services/observation";
import { listDefinitionsForPatient } from "@/server/services/observation-definition";

export const instant = false;
export const metadata = { title: "Vitální funkce" };

export default async function ObservationsPage() {
  const [session, patient] = await Promise.all([
    requireSession(),
    resolveActivePatient(),
  ]);

  if (!patient) {
    return (
      <AppShell title="Vitální funkce">
        <NoPatientState />
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
          canManageCatalog={canManageClinicalCatalog(session.user.role)}
        />
      </div>
    </AppShell>
  );
}
