import { NextResponse } from "next/server";

import { clearActivePatientCookieOn } from "@/lib/auth/active-patient";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  csrfCookieOptions,
  sessionCookieOptions,
} from "@/lib/auth/cookies";

export async function attachSessionCookies(
  response: NextResponse,
  rawToken: string,
  csrfToken: string,
): Promise<NextResponse> {
  response.cookies.set(
    SESSION_COOKIE,
    rawToken,
    await sessionCookieOptions(),
  );
  response.cookies.set(CSRF_COOKIE, csrfToken, await csrfCookieOptions());
  return response;
}

export async function clearSessionCookiesOn(
  response: NextResponse,
): Promise<NextResponse> {
  response.cookies.set(SESSION_COOKIE, "", {
    ...(await sessionCookieOptions(0)),
    maxAge: 0,
  });
  response.cookies.set(CSRF_COOKIE, "", {
    ...(await csrfCookieOptions(0)),
    maxAge: 0,
  });
  await clearActivePatientCookieOn(response);
  return response;
}
