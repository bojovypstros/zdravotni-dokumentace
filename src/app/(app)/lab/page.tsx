import { AppShell } from "@/components/app-shell/app-shell";
import { LabPanelsView } from "@/components/lab/lab-panel";
import { listLabPanels } from "@/server/services/lab";
import { listPatients } from "@/server/services/patient";

export const instant = false;
export const metadata = { title: "Laboratoř" };

export default async function LabPage() {
  const patients = await listPatients();
  const patient = patients[0];

  if (!patient) {
    return (
      <AppShell title="Laboratoř">
        <p className="text-muted-foreground text-sm">
          Nejdřív vytvořte pacientský profil v Nastavení / setup wizardu.
        </p>
      </AppShell>
    );
  }

  const panels = await listLabPanels({ patientId: patient.id });

  return (
    <AppShell title="Laboratoř">
      <div className="mx-auto max-w-4xl">
        <p className="text-muted-foreground mb-4 text-sm">
          Lab panely a výsledky analytů. Referenční intervaly patří ke
          konkrétnímu výsledku. Označení mimo meze se odvozuje jen z dodaného
          intervalu — bez diagnostiky.
        </p>
        <LabPanelsView
          patientId={patient.id}
          timeZone={patient.timezone}
          panels={panels}
        />
      </div>
    </AppShell>
  );
}
