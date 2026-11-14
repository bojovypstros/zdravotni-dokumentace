import Link from "next/link";

import { AppShell } from "@/components/app-shell/app-shell";
import { LogoutButton } from "@/components/auth/logout-button";
import { NoPatientState } from "@/components/kartoteka/no-patient-state";
import {
  PatientProfileForm,
  type PatientDto,
} from "@/components/patient/patient-profile-form";
import { ExportBackupPanel } from "@/components/settings/export-backup-panel";
import { StaffPanel } from "@/components/staff/staff-panel";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { getSessionFromCookies } from "@/lib/auth/session";
import { canManageStaff, ROLE_LABELS } from "@/lib/auth/roles";
import { secondaryNav } from "@/lib/navigation";
import { listBackupFiles } from "@/server/services/backup";
import { listDocuments } from "@/server/services/document";
import { listStaffUsers } from "@/server/services/staff";

export const instant = false;
export const metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const session = await getSessionFromCookies();
  const patient = (await resolveActivePatient()) as PatientDto | null;
  const documents = patient ? await listDocuments(patient.id) : [];
  const backups = await listBackupFiles();
  const isChief = session ? canManageStaff(session.user.role) : false;
  const staff = isChief ? await listStaffUsers() : [];

  return (
    <AppShell title="Nastavení">
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
            Účty jsou jen pro personál. Pacient nemá vlastní login.
          </p>
          <LogoutButton />
        </section>

        <section className="space-y-3 md:hidden">
          <h2 className="text-base font-medium">Další agendy</h2>
          <ul className="grid gap-2">
            <li>
              <Link
                href="/patients"
                className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 text-sm hover:bg-surface-muted"
              >
                Kartotéka
              </Link>
            </li>
            {secondaryNav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex min-h-11 items-center gap-3 rounded-md border border-border px-3 text-sm hover:bg-surface-muted"
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        {isChief ? <StaffPanel users={staff} /> : null}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-medium">Profil aktivního pacienta</h2>
            <Link
              href="/patients"
              className="text-muted-foreground text-sm underline-offset-2 hover:underline"
            >
              Kartotéka
            </Link>
          </div>
          {patient ? (
            <PatientProfileForm patient={patient} />
          ) : (
            <NoPatientState title="Žádný aktivní pacient" />
          )}
        </section>

        {patient ? (
          <section className="space-y-3">
            <h2 className="text-base font-medium">Export a záloha</h2>
            <ExportBackupPanel
              patientId={patient.id}
              initialDocuments={documents}
              initialBackups={backups}
            />
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
