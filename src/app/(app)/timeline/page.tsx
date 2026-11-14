import { AppShell } from "@/components/app-shell/app-shell";
import { TimelineList } from "@/components/timeline/timeline-list";
import { listPatients } from "@/server/services/patient";
import { listTimelineEvents } from "@/server/services/timeline";

export const instant = false;
export const metadata = { title: "Časová osa" };

export default async function TimelinePage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Časová osa">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
      </AppShell>
    );
  }

  const { events } = await listTimelineEvents({
    patientId: patient.id,
    limit: 100,
  });

  return (
    <AppShell title="Časová osa">
      <div className="mx-auto max-w-2xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Jednotná osa (zatím měření). Řazení podle času události (
          {patient.timezone}). Bez interpolace.
        </p>
        <TimelineList events={events} timeZone={patient.timezone} />
      </div>
    </AppShell>
  );
}
