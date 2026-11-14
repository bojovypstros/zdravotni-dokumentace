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
import { diaryScaleDefinitionCreateSchema } from "@/lib/validation/symptom";
import {
  DiaryScaleServiceError,
  createCustomDiaryScale,
  listPatientDiaryScales,
} from "@/server/services/diary-scale";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const url = new URL(request.url);
  const patientId = url.searchParams.get("patientId");
  if (!patientId) return jsonError("Chybí patientId.", 400);

  const scales = await listPatientDiaryScales(patientId);
  return jsonOk({ scales });
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

  const parsed = diaryScaleDefinitionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const scale = await createCustomDiaryScale({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!scale) return jsonError("Pacient nenalezen.", 404);
    return jsonOk({ scale }, { status: 201 });
  } catch (err) {
    if (err instanceof DiaryScaleServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
