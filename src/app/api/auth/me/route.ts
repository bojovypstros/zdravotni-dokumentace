import { connection } from "next/server";

import { jsonError, jsonOk, optionalSession } from "@/lib/api/http";
import { CSRF_COOKIE } from "@/lib/auth/cookies";
import { cookies } from "next/headers";

export async function GET() {
  await connection();
  const session = await optionalSession();
  if (!session) {
    return jsonError("Neautorizováno.", 401);
  }

  const jar = await cookies();
  const csrfFromCookie = jar.get(CSRF_COOKIE)?.value;

  return jsonOk({
    user: session.user,
    csrfToken: session.csrfToken,
    csrfCookiePresent: Boolean(csrfFromCookie),
    expiresAt: session.expiresAt.toISOString(),
  });
}
