import { AppShell } from "@/components/app-shell/app-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { getDashboard } from "@/server/services/dashboard";

export const instant = false;
export const metadata = { title: "Přehled" };

export default async function OverviewPage() {
  const patient = await resolveActivePatient();

  if (!patient) {
    return (
      <AppShell title="Přehled">
        <NoPatientState title="Zatím žádný pacient" />
      </AppShell>
    );
  }

  const dashboard = await getDashboard({ patientId: patient.id });
  if (!dashboard) {
    return (
      <AppShell title="Přehled">
        <p className="text-muted-foreground text-sm">Pacient nenalezen.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Přehled">
      <DashboardPanel initial={dashboard} />
    </AppShell>
  );
}
