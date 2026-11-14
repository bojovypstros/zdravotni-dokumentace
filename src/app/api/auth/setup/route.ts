import { connection } from "next/server";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/http";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  attachSessionCookies,
  clearSessionCookiesOn,
} from "@/lib/auth/session-response";
import { prisma } from "@/lib/db/prisma";
import { rateLimit } from "@/lib/security/rate-limit";
import { getClientIp, getRequestId } from "@/lib/security/request-meta";
import { setupSchema } from "@/lib/validation/auth";
import { createAuditEvent } from "@/server/services/audit";
import { getSetupStatus, markSetupCompleted } from "@/server/services/setup";

export async function POST(request: Request) {
  await connection();

  const ip = (await getClientIp()) ?? "unknown";
  const limited = rateLimit(`setup:${ip}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return jsonError("Příliš mnoho pokusů o setup. Zkuste později.", 429, {
      retryAfterMs: limited.retryAfterMs,
    });
  }

  const status = await getSetupStatus();
  if (status.completed) {
    return jsonError("Setup už byl dokončen.", 409);
  }
  if (!status.readyForSetup) {
    return jsonError(
      "Chybí povinné env proměnné. Doplňte .env (šablona .env.example).",
      503,
      { missingEnv: status.missingEnv },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Neplatné JSON tělo.", 400);
  }

  const parsed = setupSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const { username, password, displayName } = parsed.data;
  const passwordHash = await hashPassword(password);
  const requestId = await getRequestId();

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        username,
        passwordHash,
        displayName: displayName || username,
        role: "ADMIN",
      },
    });

    await createAuditEvent(tx, {
      actorId: created.id,
      entityType: "User",
      entityId: created.id,
      action: "setup",
      changeSummary: "First-run admin (vrchní lékař) setup — no patient",
      after: { username: created.username, role: created.role },
      requestId,
    });

    return created;
  });

  await markSetupCompleted();

  const session = await createSession(user.id);
  const response = NextResponse.json(
    {
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
      },
      csrfToken: session.csrfToken,
    },
    { status: 201 },
  );
  await clearSessionCookiesOn(response);
  await attachSessionCookies(response, session.rawToken, session.csrfToken);
  return response;
}
