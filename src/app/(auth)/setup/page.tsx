import { connection } from "next/server";
import { redirect } from "next/navigation";

import { SetupWizard } from "@/components/auth/setup-wizard";
import { getSetupStatus } from "@/server/services/setup";

export const instant = false;
export const metadata = { title: "První spuštění" };

export default async function SetupPage() {
  await connection();
  const status = await getSetupStatus();
  if (status.completed) {
    redirect("/login");
  }

  return (
    <SetupWizard
      readyForSetup={status.readyForSetup}
      missingEnv={status.missingEnv}
      env={status.env}
    />
  );
}
