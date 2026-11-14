import { AppShell } from "@/components/app-shell/app-shell";
import { FluidsPanel } from "@/components/fluid/fluids-panel";
import { requireChartPatient } from "@/lib/auth/active-patient";
import {
  listFluidBalanceEntries,
  summarizeFluidByDay,
} from "@/server/services/fluid";

export const instant = false;
export const metadata = { title: "Tekutiny" };

export default async function FluidsPage() {
  const patient = await requireChartPatient();

  const entries = await listFluidBalanceEntries({ patientId: patient.id });
  const daily = summarizeFluidByDay(entries, patient.timezone);

  return (
    <AppShell
      title="Tekutiny"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
      patientArchivedAt={patient.archivedAt}
    >
      <div className="mx-auto max-w-3xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Bilance tekutin: příjem/výdej, kategorie, objem v ml. Denní součty a
          čistá bilance bez klinického doporučení.
        </p>
        <FluidsPanel
          patientId={patient.id}
          timeZone={patient.timezone}
          entries={entries}
          daily={daily}
        />
      </div>
    </AppShell>
  );
}
