import { AppShell } from "@/components/app-shell/app-shell";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { MedicationsPanel } from "@/components/medication/medications-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listMedicationAdministrations } from "@/server/services/medication-administration";
import { listMedicationOrders } from "@/server/services/medication-order";

export const instant = false;
export const metadata = { title: "Medikace" };

export default async function MedicationsPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Medikace">
        <NoPatientState />
      </AppShell>
    );
  }

  const [orders, administrations] = await Promise.all([
    listMedicationOrders({ patientId: patient.id }),
    listMedicationAdministrations({ patientId: patient.id }),
  ]);

  return (
    <AppShell title="Medikace">
      <div className="mx-auto max-w-4xl">
        <MedicationsPanel
          patientId={patient.id}
          timeZone={patient.timezone}
          orders={orders}
          administrations={administrations}
        />
      </div>
    </AppShell>
  );
}
