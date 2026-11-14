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
import { labOrderWriteSchema } from "@/lib/validation/lab";
import {
  LabOrderServiceError,
  createLabOrder,
  listLabOrders,
} from "@/server/services/lab-order";

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

  const orders = await listLabOrders({ patientId });
  return jsonOk({ orders });
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

  const parsed = labOrderWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const order = await createLabOrder({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!order) return jsonError("Pacient nenalezen.", 404);
    return jsonOk({ order }, { status: 201 });
  } catch (err) {
    if (err instanceof LabOrderServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
