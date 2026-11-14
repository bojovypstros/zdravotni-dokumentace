import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { fluidBalanceWriteSchema } from "@/lib/validation/fluid";
import {
  FluidServiceError,
  updateFluidBalanceEntry,
} from "@/server/services/fluid";

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

  const parsed = fluidBalanceWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const entry = await updateFluidBalanceEntry({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!entry) return jsonError("Záznam tekutin nenalezen.", 404);
    return jsonOk({ entry });
  } catch (err) {
    if (err instanceof FluidServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
