import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireApiSession,
  requireMutatingSession,
} from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { getRequestId } from "@/lib/security/request-meta";
import { criticalFlagWriteSchema } from "@/lib/validation/critical-flag";
import {
  createCriticalFlag,
  CriticalFlagServiceError,
  listCriticalFlags,
} from "@/server/services/critical-flag";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const patientId = new URL(request.url).searchParams.get("patientId");
  if (!patientId) return jsonError("Chybí patientId.", 400);

  const flags = await listCriticalFlags(patientId);
  return jsonOk({ flags });
}

export async function POST(request: Request) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Neplatné JSON tělo.", 400);
  }

  const parsed = criticalFlagWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const flag = await createCriticalFlag({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    return jsonOk({ flag }, { status: 201 });
  } catch (err) {
    if (err instanceof CriticalFlagServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
