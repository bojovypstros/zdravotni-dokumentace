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
  getPatient,
  PatientServiceError,
  updatePatient,
} from "@/server/services/patient";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) return jsonError("Pacient nenalezen.", 404);
  return jsonOk({ patient });
}

export async function PATCH(request: Request, { params }: Params) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  const { id } = await params;
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

  try {
    const requestId = await getRequestId();
    const patient = await updatePatient({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
      reason:
        typeof body === "object" &&
        body &&
        "reason" in body &&
        typeof (body as { reason?: unknown }).reason === "string"
          ? (body as { reason: string }).reason
          : undefined,
    });
    if (!patient) return jsonError("Pacient nenalezen.", 404);
    return jsonOk({ patient });
  } catch (err) {
    if (err instanceof PatientServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
