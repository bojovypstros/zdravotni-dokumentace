import Link from "next/link";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { CriticalFlagsPanel } from "@/components/critical-flag/critical-flags-panel";
import { SetActivePatientButton } from "@/components/kartoteka/set-active-patient-button";
import {
  PatientProfileForm,
  type PatientDto,
} from "@/components/patient/patient-profile-form";
import { Button } from "@/components/ui/button";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { listCriticalFlags } from "@/server/services/critical-flag";
import { getPatient } from "@/server/services/patient";

type Params = { params: Promise<{ id: string }> };

export const instant = false;

export async function generateMetadata({ params }: Params) {
  const { id } = await params;
  const patient = await getPatient(id);
  return {
    title: patient ? `Pacient · ${patient.displayName}` : "Pacient",
  };
}

export default async function PatientDetailPage({ params }: Params) {
  const { id } = await params;
  const patient = (await getPatient(id)) as PatientDto | null;
  if (!patient) notFound();

  const [active, flags] = await Promise.all([
    resolveActivePatient(),
    listCriticalFlags(patient.id),
  ]);
  const isActive = active?.id === patient.id;

  return (
    <AppShell title={patient.displayName}>
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-muted-foreground text-sm">
              <Link
                href="/patients"
                className="underline-offset-2 hover:underline"
              >
                Kartotéka
              </Link>
              {isActive ? " · aktivní pacient" : null}
            </p>
            <h2 className="truncate text-lg font-semibold tracking-tight">
              Profil pacienta
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isActive ? (
              <SetActivePatientButton patientId={patient.id} />
            ) : (
              <Button
                type="button"
                variant="secondary"
                className="min-h-11"
                disabled
              >
                Aktivní
              </Button>
            )}
          </div>
        </div>

        <CriticalFlagsPanel patientId={patient.id} flags={flags} />

        <PatientProfileForm patient={patient} />
      </div>
    </AppShell>
  );
}
