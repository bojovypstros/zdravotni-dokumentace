import { AppShell } from "@/components/app-shell/app-shell";
import { TimelineList } from "@/components/timeline/timeline-list";
import { requireChartPatient } from "@/lib/auth/active-patient";
import { listTimelineEvents } from "@/server/services/timeline";

export const instant = false;
export const metadata = { title: "Časová osa" };

export default async function TimelinePage() {
  const patient = await requireChartPatient();

  const { events, groups, total, nextOffset } = await listTimelineEvents({
    patientId: patient.id,
    limit: 50,
    offset: 0,
    groupByDay: true,
    timeZone: patient.timezone,
  });

  return (
    <AppShell
      title="Časová osa"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
    >
      <div className="mx-auto max-w-2xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Jednotná osa (měření, podání léků, symptomy, deník škál, poznámky).
          Řazení podle času události ({patient.timezone}). Filtry, seskupení po
          dnech, stránkování. Bez interpolace; každá událost jednou.
        </p>
        <TimelineList
          patientId={patient.id}
          timeZone={patient.timezone}
          initialEvents={events}
          initialGroups={groups}
          initialTotal={total}
          initialNextOffset={nextOffset}
        />
      </div>
    </AppShell>
  );
}
