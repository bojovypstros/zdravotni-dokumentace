import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { diaryScaleReadingWriteSchema } from "@/lib/validation/symptom";
import {
  DiaryScaleServiceError,
  updateDiaryScaleReading,
} from "@/server/services/diary-scale";

type Params = { params: Promise<{ id: string }> };

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

  const parsed = diaryScaleReadingWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const reading = await updateDiaryScaleReading({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!reading) return jsonError("Záznam deníku nenalezen.", 404);
    return jsonOk({ reading });
  } catch (err) {
    if (err instanceof DiaryScaleServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
