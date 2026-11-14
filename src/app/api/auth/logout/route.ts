import { cookies } from "next/headers";
import { connection } from "next/server";
import { NextResponse } from "next/server";

import { isNextResponse, requireMutatingSession } from "@/lib/api/http";
import { SESSION_COOKIE } from "@/lib/auth/cookies";
import { destroySessionByRawToken } from "@/lib/auth/session";
import { clearSessionCookiesOn } from "@/lib/auth/session-response";
import { prisma } from "@/lib/db/prisma";
import { getRequestId } from "@/lib/security/request-meta";
import { createAuditEvent } from "@/server/services/audit";

export async function POST(request: Request) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;
  const session = sessionOrError;

  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  await destroySessionByRawToken(raw);

  const requestId = await getRequestId();
  await createAuditEvent(prisma, {
    actorId: session.user.id,
    entityType: "Session",
    entityId: session.sessionId,
    action: "logout",
    requestId,
  });

  const response = NextResponse.json({ ok: true });
  await clearSessionCookiesOn(response);
  return response;
}
