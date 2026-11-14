import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { allergyWriteSchema } from "@/lib/validation/allergy";
import {
  AllergyServiceError,
  archiveAllergy,
  updateAllergy,
} from "@/server/services/allergy";

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

  const parsed = allergyWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const allergy = await updateAllergy({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!allergy) return jsonError("Alergie nenalezena.", 404);
    return jsonOk({ allergy });
  } catch (err) {
    if (err instanceof AllergyServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}

export async function DELETE(request: Request, { params }: Params) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  const { id } = await params;
  const requestId = await getRequestId();
  const allergy = await archiveAllergy({
    id,
    actorId: sessionOrError.user.id,
    requestId,
    reason: "archive via API",
  });
  if (!allergy) return jsonError("Alergie nenalezena.", 404);
  return jsonOk({ allergy });
}
