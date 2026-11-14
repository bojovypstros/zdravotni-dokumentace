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
import { diagnosisWriteSchema } from "@/lib/validation/diagnosis";
import {
  createDiagnosis,
  listDiagnoses,
} from "@/server/services/diagnosis";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const patientId = new URL(request.url).searchParams.get("patientId");
  if (!patientId) {
    return jsonError("Chybí patientId.", 400);
  }

  const diagnoses = await listDiagnoses(patientId);
  return jsonOk({ diagnoses });
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

  const parsed = diagnosisWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const requestId = await getRequestId();
  const diagnosis = await createDiagnosis({
    input: parsed.data,
    actorId: sessionOrError.user.id,
    requestId,
  });
  if (!diagnosis) return jsonError("Pacient nenalezen.", 404);
  return jsonOk({ diagnosis }, { status: 201 });
}
