import { AppShell } from "@/components/app-shell/app-shell";
import { ProceduresPanel } from "@/components/procedure/procedures-panel";
import { requireChartPatient } from "@/lib/auth/active-patient";
import { listProcedures } from "@/server/services/procedure";

export const instant = false;
export const metadata = { title: "Výkony" };

export default async function ProceduresPage() {
  const patient = await requireChartPatient();
  const procedures = await listProcedures({ patientId: patient.id });

  return (
    <AppShell
      title="Výkony"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
      patientArchivedAt={patient.archivedAt}
    >
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
