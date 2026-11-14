import { NextResponse } from "next/server";

import {
  AuthError,
  getSessionFromCookies,
  requireSession,
  verifyCsrf,
  type ActiveSession,
} from "@/lib/auth/session";
import { assertTrustedOrigin } from "@/lib/security/request-meta";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(error: string, status: number, extra?: object) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function requireApiSession(): Promise<ActiveSession> {
  return requireSession();
}

export async function requireMutatingSession(
  request: Request,
): Promise<ActiveSession | NextResponse> {
  const originCheck = await assertTrustedOrigin();
  if (!originCheck.ok) {
    return jsonError(originCheck.error, originCheck.status);
  }

  let session: ActiveSession;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof AuthError) {
      return jsonError("Neautorizováno.", err.status);
    }
    throw err;
  }

  const csrfHeader = request.headers.get("x-csrf-token");
  const ok = await verifyCsrf(session, csrfHeader);
  if (!ok) {
    return jsonError("Neplatný CSRF token.", 403);
  }
  return session;
}

export function isNextResponse(
  value: ActiveSession | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

export async function optionalSession() {
  return getSessionFromCookies();
}
