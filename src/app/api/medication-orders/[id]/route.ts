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
import { medicationOrderWriteSchema } from "@/lib/validation/medication";
import {
  MedicationOrderServiceError,
  getMedicationOrder,
  updateMedicationOrder,
} from "@/server/services/medication-order";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const { id } = await params;
  const order = await getMedicationOrder(id);
  if (!order) return jsonError("Ordinace nenalezena.", 404);
  return jsonOk({ order });
}

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

  const parsed = medicationOrderWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const order = await updateMedicationOrder({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!order) return jsonError("Ordinace nenalezena.", 404);
    return jsonOk({ order });
  } catch (err) {
    if (err instanceof MedicationOrderServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
