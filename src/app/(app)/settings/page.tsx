import { AppShell } from "@/components/app-shell/app-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import {
  PatientProfileForm,
  type PatientDto,
} from "@/components/patient/patient-profile-form";
import { getSessionFromCookies } from "@/lib/auth/session";
import { listPatients } from "@/server/services/patient";


export const instant = false;
export const metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const session = await getSessionFromCookies();
  const patients = await listPatients();
  const patient = patients[0] as PatientDto | undefined;

  return (
    <AppShell title="Nastavení">
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="space-y-3">
          <h2 className="text-base font-medium">Účet</h2>
          <p className="text-muted-foreground text-sm">
            Přihlášen: {session?.user.displayName ?? session?.user.username}
          </p>
          <LogoutButton />
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-medium">Profil pacienta</h2>
          {patient ? (
            <PatientProfileForm patient={patient} />
          ) : (
            <p className="text-muted-foreground text-sm">
              Žádný pacient. Dokončete setup nebo vytvořte profil přes API.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
