import { cookies } from "next/headers";
import { connection } from "next/server";

import { jsonError, jsonOk, optionalSession } from "@/lib/api/http";
import { resolveActivePatient } from "@/lib/auth/active-patient";
import { CSRF_COOKIE } from "@/lib/auth/cookies";
import { ROLE_LABELS } from "@/lib/auth/roles";

export async function GET() {
  await connection();
  const session = await optionalSession();
  if (!session) {
    return jsonError("Neautorizováno.", 401);
  }

  const jar = await cookies();
  const csrfFromCookie = jar.get(CSRF_COOKIE)?.value;
  const activePatient = await resolveActivePatient();

  return jsonOk({
    user: {
      ...session.user,
      roleLabel: ROLE_LABELS[session.user.role],
    },
    activePatient: activePatient
      ? {
          id: activePatient.id,
          displayName: activePatient.displayName,
          preferredName: activePatient.preferredName,
        }
      : null,
    csrfToken: session.csrfToken,
    csrfCookiePresent: Boolean(csrfFromCookie),
    expiresAt: session.expiresAt.toISOString(),
  });
}
