import { connection } from "next/server";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/http";
import { hashPassword } from "@/lib/auth/password";
import { setActivePatientCookieOn } from "@/lib/auth/active-patient";
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

  const { username, password, displayName, patientDisplayName } = parsed.data;
  const passwordHash = await hashPassword(password);
  const requestId = await getRequestId();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        username,
        passwordHash,
        displayName: displayName || username,
        role: "ADMIN",
      },
    });

    const patient = await tx.patient.create({
      data: {
        displayName: patientDisplayName,
        preferredName: patientDisplayName,
        addressForm: "preferred_name",
        timezone: "Europe/Prague",
        noKnownAllergies: false,
        isActive: true,
      },
    });

    await createAuditEvent(tx, {
      actorId: user.id,
      patientId: patient.id,
      entityType: "User",
      entityId: user.id,
      action: "setup",
      changeSummary: "First-run admin setup",
      after: { username: user.username, role: user.role },
      requestId,
    });

    await createAuditEvent(tx, {
      actorId: user.id,
      patientId: patient.id,
      entityType: "Patient",
      entityId: patient.id,
      action: "create",
      changeSummary: "Bootstrap patient from setup wizard",
      after: { displayName: patient.displayName },
      requestId,
    });

    return { user, patient };
  });

  await markSetupCompleted();

  const session = await createSession(result.user.id);
  const response = NextResponse.json(
    {
      ok: true,
      user: {
        id: result.user.id,
        username: result.user.username,
        displayName: result.user.displayName,
      },
      patient: {
        id: result.patient.id,
        displayName: result.patient.displayName,
      },
      csrfToken: session.csrfToken,
    },
    { status: 201 },
  );
  await clearSessionCookiesOn(response);
  await attachSessionCookies(response, session.rawToken, session.csrfToken);
  await setActivePatientCookieOn(response, result.patient.id);
  return response;
}
