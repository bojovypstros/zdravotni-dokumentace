import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell/app-shell";
import { CriticalFlagsPanel } from "@/components/critical-flag/critical-flags-panel";
import {
  PatientProfileForm,
  type PatientDto,
} from "@/components/patient/patient-profile-form";
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

  return (
    <AppShell
      title="Profil pacienta"
      variant="chart"
      patientId={patient.id}
      patientDisplayName={patient.displayName}
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
          <h2 className="truncate text-lg font-semibold tracking-tight">
            {patient.displayName}
          </h2>
        </div>

        <CriticalFlagsPanel patientId={patient.id} flags={flags} />

        <PatientProfileForm patient={patient} />
      </div>
    </AppShell>
  );
}
