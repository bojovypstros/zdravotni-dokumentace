import { Suspense } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { KartotekaPanel } from "@/components/kartoteka/kartoteka-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import {
  listPatients,
  parsePatientArchiveFilter,
} from "@/server/services/patient";

export const instant = false;
export const metadata = { title: "Kartotéka" };

type Props = {
  searchParams: Promise<{ archive?: string; open?: string; to?: string }>;
};

export default async function PatientsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const archiveFilter = parsePatientArchiveFilter(sp.archive);
  const [patients, active] = await Promise.all([
    listPatients({ archive: archiveFilter }),
    resolveActivePatient(),
  ]);

  return (
    <AppShell title="Kartotéka" variant="list">
      <Suspense fallback={<p className="text-muted-foreground text-sm">Načítám…</p>}>
        <KartotekaPanel
          patients={patients}
          activePatientId={active?.id ?? null}
          archiveFilter={archiveFilter}
        />
      </Suspense>
    </AppShell>
  );
}
