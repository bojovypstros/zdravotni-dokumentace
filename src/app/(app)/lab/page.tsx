import { AppShell } from "@/components/app-shell/app-shell";
import { LabWorkspace } from "@/components/lab/lab-workspace";
import { requireChartPatient } from "@/lib/auth/active-patient";
import { canManageClinicalCatalog } from "@/lib/auth/roles";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listLabAnalyteDefinitions } from "@/server/services/lab-analyte-definition";
import { LAB_PANEL_PRESETS } from "@/server/services/lab-catalog";
import { listLabPanels } from "@/server/services/lab";
import { listLabOrders } from "@/server/services/lab-order";

export const instant = false;
export const metadata = { title: "Laboratoř" };

export default async function LabPage() {
  const session = await getSessionFromCookies();
  const patient = await requireChartPatient();

  const [panels, orders, definitions] = await Promise.all([
    listLabPanels({ patientId: patient.id }),
    listLabOrders({ patientId: patient.id }),
    listLabAnalyteDefinitions({ activeOnly: false }),
  ]);

  return (
    <AppShell
      title="Laboratoř"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Žádanky (objednávky) a výsledky jsou oddělené. Výsledek může existovat
          bez žádanky. Referenční meze v katalogu jsou výchozí šablony — při
          zápisu se ukládají jako snapshot u výsledku.
        </p>
        <LabWorkspace
          patientId={patient.id}
          patientSexAtBirth={patient.sexAtBirth}
          timeZone={patient.timezone}
          orders={orders}
          panels={panels}
          definitions={definitions}
          presets={LAB_PANEL_PRESETS.map((p) => ({
            key: p.key,
            label: p.label,
            analyteKeys: [...p.analyteKeys],
          }))}
          canManageCatalog={
            session ? canManageClinicalCatalog(session.user.role) : false
          }
        />
      </div>
    </AppShell>
  );
}
