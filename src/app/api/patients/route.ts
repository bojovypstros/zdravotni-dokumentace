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
import { patientWriteSchema } from "@/lib/validation/patient";
import {
  createPatient,
  listPatients,
} from "@/server/services/patient";

export async function GET() {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }
  const patients = await listPatients();
  return jsonOk({ patients });
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

  const parsed = patientWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const requestId = await getRequestId();
  const patient = await createPatient({
    input: parsed.data,
    actorId: sessionOrError.user.id,
    requestId,
  });

  return jsonOk({ patient }, { status: 201 });
}
