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
import {
  DocumentServiceError,
  deleteDocument,
  getDocument,
} from "@/server/services/document";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const { id } = await ctx.params;
  const document = await getDocument(id);
  if (!document) return jsonError("Dokument nenalezen.", 404);
  return jsonOk({ document });
}

export async function DELETE(request: Request, ctx: Ctx) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  const { id } = await ctx.params;
  try {
    const requestId = await getRequestId();
    const ok = await deleteDocument({
      id,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!ok) return jsonError("Dokument nenalezen.", 404);
    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof DocumentServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
