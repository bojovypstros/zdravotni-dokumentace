import { connection } from "next/server";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getSessionFromCookies } from "@/lib/auth/session";
import { getSetupStatus } from "@/server/services/setup";

export const instant = false;
export const metadata = { title: "Přihlášení" };

export default async function LoginPage() {
  await connection();
  const status = await getSetupStatus();
  if (!status.completed) {
    redirect("/setup");
  }

  const session = await getSessionFromCookies();
  if (session) {
    redirect("/overview");
  }

  return <LoginForm />;
}
