import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import {
  CLINICAL_CATALOG_FORBIDDEN_MESSAGE,
  canManageClinicalCatalog,
} from "@/lib/auth/roles";
import { getRequestId } from "@/lib/security/request-meta";
import { labAnalyteDefinitionUpdateSchema } from "@/lib/validation/lab";
import {
  LabAnalyteDefinitionServiceError,
  updateLabAnalyteDefinition,
} from "@/server/services/lab-analyte-definition";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  if (!canManageClinicalCatalog(sessionOrError.user.role)) {
    return jsonError(CLINICAL_CATALOG_FORBIDDEN_MESSAGE, 403);
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Neplatné JSON tělo.", 400);
  }

  const parsed = labAnalyteDefinitionUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const definition = await updateLabAnalyteDefinition({
      id,
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!definition) return jsonError("Definice analytu nenalezena.", 404);
    return jsonOk({ definition });
  } catch (err) {
    if (err instanceof LabAnalyteDefinitionServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
