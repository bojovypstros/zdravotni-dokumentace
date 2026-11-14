import Link from "next/link";

import { AppShell } from "@/components/app-shell/app-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { ExportBackupPanel } from "@/components/settings/export-backup-panel";
import { StaffPanel } from "@/components/staff/staff-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { getSessionFromCookies } from "@/lib/auth/session";
import { canManageStaff, ROLE_LABELS } from "@/lib/auth/roles";
import { listBackupFiles } from "@/server/services/backup";
import { listDocuments } from "@/server/services/document";
import { listStaffUsers } from "@/server/services/staff";

export const instant = false;
export const metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const session = await getSessionFromCookies();
  const patient = await resolveActivePatient();
  const documents = patient ? await listDocuments(patient.id) : [];
  const backups = await listBackupFiles();
  const isChief = session ? canManageStaff(session.user.role) : false;
  const staff = isChief ? await listStaffUsers() : [];

  return (
    <AppShell title="Nastavení" variant="settings">
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="space-y-3">
          <h2 className="text-base font-medium">Účet</h2>
          <p className="text-muted-foreground text-sm">
            Přihlášen: {session?.user.displayName ?? session?.user.username}
            {session?.user.role
              ? ` · ${ROLE_LABELS[session.user.role]}`
              : null}
          </p>
          <p className="text-muted-foreground text-xs">
            Účty jsou jen pro personál. Pacient nemá vlastní login. Profil
            pacienta se edituje uvnitř dekurzu.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/patients"
              className="text-sm underline-offset-2 hover:underline"
            >
              Kartotéka
            </Link>
            {patient ? (
              <Link
                href={`/patients/${patient.id}`}
                className="text-sm underline-offset-2 hover:underline"
              >
                Profil aktivního pacienta
              </Link>
            ) : null}
          </div>
          <LogoutButton />
        </section>

        {isChief ? <StaffPanel users={staff} /> : null}

        {patient ? (
          <section className="space-y-3">
            <h2 className="text-base font-medium">Export a záloha</h2>
            <ExportBackupPanel
              patientId={patient.id}
              initialDocuments={documents}
              initialBackups={backups}
            />
          </section>
        ) : (
          <section className="space-y-2">
            <h2 className="text-base font-medium">Export a záloha</h2>
            <p className="text-muted-foreground text-sm">
              Nejdřív otevřete pacienta z{" "}
              <Link
                href="/patients"
                className="underline-offset-2 hover:underline"
              >
                kartotéky
              </Link>
              .
            </p>
          </section>
        )}
      </div>
    </AppShell>
  );
}
