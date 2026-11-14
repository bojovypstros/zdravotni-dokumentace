import { AppShell } from "@/components/app-shell/app-shell";
import { MedicationsPanel } from "@/components/medication/medications-panel";
import { listMedicationAdministrations } from "@/server/services/medication-administration";
import { listMedicationOrders } from "@/server/services/medication-order";
import { listPatients } from "@/server/services/patient";

export const instant = false;
export const metadata = { title: "Medikace" };

export default async function MedicationsPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Medikace">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
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
