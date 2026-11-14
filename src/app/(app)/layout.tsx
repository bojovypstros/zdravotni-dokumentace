import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getSessionFromCookies } from "@/lib/auth/session";
import { getSetupStatus } from "@/server/services/setup";

/** Auth + DB — never prerender protected shell. */
export const instant = false;

export default async function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const setup = await getSetupStatus();
  if (!setup.completed) {
    redirect("/setup");
  }

  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  return children;
}
