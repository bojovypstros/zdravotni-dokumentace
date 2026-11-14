import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import { unarchivePatient } from "@/server/services/patient";

type Params = { params: Promise<{ id: string }> };

/** Restore soft-archived patient. ADMIN and DOCTOR (klinický režim). */
export async function POST(request: Request, { params }: Params) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  const { id } = await params;
  let reason: string | undefined;
  try {
    const body = (await request.json()) as { reason?: unknown };
    if (typeof body?.reason === "string") reason = body.reason;
  } catch {
    // empty body is fine
  }

  const requestId = await getRequestId();
  const patient = await unarchivePatient({
    id,
    actorId: sessionOrError.user.id,
    requestId,
    reason,
  });
  if (!patient) return jsonError("Pacient nenalezen.", 404);
  return jsonOk({ patient });
}
