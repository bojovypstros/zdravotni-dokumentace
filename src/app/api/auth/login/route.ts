import { connection } from "next/server";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/http";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  attachSessionCookies,
  clearSessionCookiesOn,
} from "@/lib/auth/session-response";
import { prisma } from "@/lib/db/prisma";
import { loginFailureDelay, rateLimit } from "@/lib/security/rate-limit";
import {
  assertTrustedOrigin,
  getClientIp,
  getRequestId,
} from "@/lib/security/request-meta";
import { loginSchema } from "@/lib/validation/auth";
import { createAuditEvent } from "@/server/services/audit";
import { getSetupStatus } from "@/server/services/setup";

export async function POST(request: Request) {
  await connection();

  const originCheck = await assertTrustedOrigin();
  if (!originCheck.ok) {
    return jsonError(originCheck.error, originCheck.status);
  }

  const ip = (await getClientIp()) ?? "unknown";
  const limited = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limited.ok) {
    return jsonError("Příliš mnoho pokusů o přihlášení.", 429, {
      retryAfterMs: limited.retryAfterMs,
    });
  }

  const setup = await getSetupStatus();
  if (!setup.completed) {
    return jsonError("Aplikace ještě není nastavena.", 409, {
      setupRequired: true,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Neplatné JSON tělo.", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    await loginFailureDelay();
    return jsonError("Neplatné přihlašovací údaje.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
  });

  const valid =
    user !== null &&
    (await verifyPassword(user.passwordHash, parsed.data.password));

  if (!valid || !user) {
    await loginFailureDelay();
    return jsonError("Neplatné přihlašovací údaje.", 401);
  }

  const session = await createSession(user.id);
  const requestId = await getRequestId();
  await createAuditEvent(prisma, {
    actorId: user.id,
    entityType: "Session",
    entityId: session.rawToken.slice(0, 8),
    action: "login",
    changeSummary: "User login",
    requestId,
  });

  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
    csrfToken: session.csrfToken,
  });
  await clearSessionCookiesOn(response);
  await attachSessionCookies(response, session.rawToken, session.csrfToken);
  return response;
}
