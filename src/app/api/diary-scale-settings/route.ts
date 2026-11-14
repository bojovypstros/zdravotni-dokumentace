import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { diaryScaleSettingUpdateSchema } from "@/lib/validation/symptom";
import {
  DiaryScaleServiceError,
  upsertDiaryScaleSetting,
} from "@/server/services/diary-scale";

export async function PUT(request: Request) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Neplatné JSON tělo.", 400);
  }

  const parsed = diaryScaleSettingUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const setting = await upsertDiaryScaleSetting({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    return jsonOk({ setting });
  } catch (err) {
    if (err instanceof DiaryScaleServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
