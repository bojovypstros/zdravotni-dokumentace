import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { criticalFlagUpdateSchema } from "@/lib/validation/critical-flag";
import {
  CriticalFlagServiceError,
  updateCriticalFlag,
} from "@/server/services/critical-flag";

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

  const parsed = criticalFlagUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const flag = await updateCriticalFlag({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!flag) return jsonError("Flag nenalezen.", 404);
    return jsonOk({ flag });
  } catch (err) {
    if (err instanceof CriticalFlagServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
