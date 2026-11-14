import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { labOrderWriteSchema } from "@/lib/validation/lab";
import {
  LabOrderServiceError,
  updateLabOrder,
} from "@/server/services/lab-order";

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

  const parsed = labOrderWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const order = await updateLabOrder({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!order) return jsonError("Žádanka nenalezena.", 404);
    return jsonOk({ order });
  } catch (err) {
    if (err instanceof LabOrderServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
