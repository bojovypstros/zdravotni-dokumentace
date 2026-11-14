import { AppShell } from "@/components/app-shell/app-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { requireChartPatient } from "@/lib/auth/active-patient";
import { getDashboard } from "@/server/services/dashboard";

export const instant = false;
export const metadata = { title: "Přehled" };

export default async function OverviewPage() {
  const patient = await requireChartPatient();
  const dashboard = await getDashboard({ patientId: patient.id });

  if (!dashboard) {
    return (
      <AppShell
        title="Přehled"
        variant="chart"
        patientId={patient.id}
        patientDisplayName={patient.displayName}
        patientArchivedAt={patient.archivedAt}
      >
        <p className="text-muted-foreground text-sm">Pacient nenalezen.</p>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Přehled"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
      patientArchivedAt={patient.archivedAt}
    >
      <DashboardPanel initial={dashboard} />
    </AppShell>
  );
}
