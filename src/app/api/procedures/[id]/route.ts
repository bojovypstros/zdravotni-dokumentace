import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { procedureWriteSchema } from "@/lib/validation/procedure";
import {
  ProcedureServiceError,
  updateProcedure,
} from "@/server/services/procedure";

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

  const parsed = procedureWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const procedure = await updateProcedure({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!procedure) return jsonError("Výkon nenalezen.", 404);
    return jsonOk({ procedure });
  } catch (err) {
    if (err instanceof ProcedureServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
