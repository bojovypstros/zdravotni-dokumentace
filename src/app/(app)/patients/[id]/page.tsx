import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { CriticalFlagsPanel } from "@/components/critical-flag/critical-flags-panel";
import { PatientArchiveActions } from "@/components/patient/patient-archive-actions";
import { PatientArchiveBadge } from "@/components/patient/patient-archive-badge";
import {
  PatientProfileForm,
  type PatientDto,
} from "@/components/patient/patient-profile-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { readActivePatientIdFromCookies } from "@/lib/auth/active-patient";
import { listCriticalFlags } from "@/server/services/critical-flag";
import { getPatient } from "@/server/services/patient";

type Params = { params: Promise<{ id: string }> };

export const instant = false;

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const patient = await getPatient(id);
  return {
    title: patient ? `Profil · ${patient.displayName}` : "Profil",
  };
}

export default async function PatientDetailPage({ params }: Params) {
  const { id } = await params;
  const patient = (await getPatient(id)) as PatientDto | null;
  if (!patient) notFound();

  const cookieId = await readActivePatientIdFromCookies();
  // Profile is a chart module — select patient via kartotéka when needed.
  if (cookieId !== patient.id) {
    redirect(`/patients?open=${encodeURIComponent(patient.id)}&to=profile`);
  }

  const flags = await listCriticalFlags(patient.id);
  const archived = Boolean(patient.archivedAt);

  return (
    <AppShell
      title="Profil pacienta"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
      patientArchivedAt={patient.archivedAt}
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            Úprava profilu uvnitř dekurzu.{" "}
            <Link
              href="/overview"
              className="underline-offset-2 hover:underline"
            >
              Zpět na přehled
            </Link>
          </p>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="truncate">{patient.displayName}</span>
            {archived ? <PatientArchiveBadge /> : null}
          </h2>
        </div>

        {archived ? (
          <Alert>
            <AlertTitle>Archivovaný pacient</AlertTitle>
            <AlertDescription>
              Záznamy a historie zůstávají dostupné. Nové zápisy jsou povoleny
              (např. doplnění dokumentace). Obnovením se pacient vrátí do
              aktivní kartotéky.
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="space-y-2">
          <h3 className="text-sm font-medium">Archiv</h3>
          <PatientArchiveActions
            patientId={patient.id}
            archivedAt={patient.archivedAt ?? null}
          />
        </section>

        <CriticalFlagsPanel patientId={patient.id} flags={flags} />

        <PatientProfileForm patient={patient} />
      </div>
    </AppShell>
  );
}
