import { AppShell } from "@/components/app-shell/app-shell";
import { ProceduresPanel } from "@/components/procedure/procedures-panel";
import { listPatients } from "@/server/services/patient";
import { listProcedures } from "@/server/services/procedure";

export const instant = false;
export const metadata = { title: "Výkony" };

export default async function ProceduresPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Výkony">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
      </AppShell>
    );
  }

  const procedures = await listProcedures({ patientId: patient.id });

  return (
    <AppShell title="Výkony">
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Evidence výkonů / procedur (název, stav, čas, provádějící, výsledek).
        </p>
        <ProceduresPanel
          patientId={patient.id}
          timeZone={patient.timezone}
          procedures={procedures}
        />
      </div>
    </AppShell>
  );
}
