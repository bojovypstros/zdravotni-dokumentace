import { AppShell } from "@/components/app-shell/app-shell";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { ProceduresPanel } from "@/components/procedure/procedures-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listProcedures } from "@/server/services/procedure";

export const instant = false;
export const metadata = { title: "Výkony" };

export default async function ProceduresPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Výkony">
        <NoPatientState />
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
