import { AppShell } from "@/components/app-shell/app-shell";
import { KartotekaPanel } from "@/components/kartoteka/kartoteka-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listPatients } from "@/server/services/patient";

export const instant = false;
export const metadata = { title: "Kartotéka" };

export default async function PatientsPage() {
  const [patients, active] = await Promise.all([
    listPatients(),
    resolveActivePatient(),
  ]);

  return (
    <AppShell title="Kartotéka">
      <KartotekaPanel
        patients={patients}
        activePatientId={active?.id ?? null}
      />
    </AppShell>
  );
}
