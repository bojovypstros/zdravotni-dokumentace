import { AppShell } from "@/components/app-shell/app-shell";
import { FluidsPanel } from "@/components/fluid/fluids-panel";
import {
  listFluidBalanceEntries,
  summarizeFluidByDay,
} from "@/server/services/fluid";
import { listPatients } from "@/server/services/patient";

export const instant = false;
export const metadata = { title: "Tekutiny" };

export default async function FluidsPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Tekutiny">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
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
