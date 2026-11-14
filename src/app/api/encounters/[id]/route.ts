import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { encounterWriteSchema } from "@/lib/validation/encounter";
import {
  EncounterServiceError,
  updateEncounter,
} from "@/server/services/encounter";

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

  const parsed = encounterWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const encounter = await updateEncounter({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!encounter) return jsonError("Událost/pobyt nenalezen.", 404);
    return jsonOk({ encounter });
  } catch (err) {
    if (err instanceof EncounterServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
