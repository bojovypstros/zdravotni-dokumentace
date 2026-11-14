import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { clinicalNoteWriteSchema } from "@/lib/validation/clinical-note";
import {
  ClinicalNoteServiceError,
  updateClinicalNote,
} from "@/server/services/clinical-note";

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

  const parsed = clinicalNoteWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const note = await updateClinicalNote({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!note) return jsonError("Poznámka nenalezena.", 404);
    return jsonOk({ note });
  } catch (err) {
    if (err instanceof ClinicalNoteServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
