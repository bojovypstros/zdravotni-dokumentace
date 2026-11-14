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
import { diaryScaleReadingWriteSchema } from "@/lib/validation/symptom";
import {
  DiaryScaleServiceError,
  createDiaryScaleReading,
  listDiaryScaleReadings,
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

  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const limitRaw = url.searchParams.get("limit");

  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    return jsonError("Neplatný parametr from.", 400);
  }
  if (to && Number.isNaN(to.getTime())) {
    return jsonError("Neplatný parametr to.", 400);
  }

  const readings = await listDiaryScaleReadings({
    patientId,
    from,
    to,
    limit: limitRaw ? Number(limitRaw) : undefined,
  });
  return jsonOk({ readings });
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

  const parsed = diaryScaleReadingWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const reading = await createDiaryScaleReading({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!reading) return jsonError("Pacient nenalezen.", 404);
    return jsonOk({ reading }, { status: 201 });
  } catch (err) {
    if (err instanceof DiaryScaleServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
