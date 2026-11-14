import { AppShell } from "@/components/app-shell/app-shell";
import { DashboardPanel } from "@/components/dashboard/dashboard-panel";
import { Button } from "@/components/ui/button";
import { getDashboard } from "@/server/services/dashboard";
import { listPatients } from "@/server/services/patient";
import Link from "next/link";

export const instant = false;
export const metadata = { title: "Přehled" };

export default async function OverviewPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Přehled">
        <section className="mx-auto max-w-lg space-y-3 rounded-xl border border-dashed border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Zatím žádný pacient</h2>
          <p className="text-muted-foreground text-sm">
            Dashboard potřebuje pacientský profil. Dokončete setup wizard nebo
            vytvořte profil v Nastavení.
          </p>
          <Button asChild className="min-h-11">
            <Link href="/settings">Přejít do Nastavení</Link>
          </Button>
        </section>
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
