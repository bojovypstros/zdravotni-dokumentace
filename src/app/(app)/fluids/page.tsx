import { AppShell } from "@/components/app-shell/app-shell";
import { FluidsPanel } from "@/components/fluid/fluids-panel";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import {
  listFluidBalanceEntries,
  summarizeFluidByDay,
} from "@/server/services/fluid";

export const instant = false;
export const metadata = { title: "Tekutiny" };

export default async function FluidsPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Tekutiny">
        <NoPatientState />
      </AppShell>
    );
  }

  const entries = await listFluidBalanceEntries({ patientId: patient.id });
  const daily = summarizeFluidByDay(entries, patient.timezone);

  return (
    <AppShell title="Tekutiny">
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
