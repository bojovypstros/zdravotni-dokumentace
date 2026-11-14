import { connection } from "next/server";
import { z } from "zod";

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
import { observationDefinitionUpdateSchema } from "@/lib/validation/observation";
import {
  ObservationDefinitionServiceError,
  updateDefinition,
} from "@/server/services/observation-definition";

type Params = { params: Promise<{ id: string }> };

const patchBodySchema = observationDefinitionUpdateSchema.extend({
  patientId: z.string().uuid(),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

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

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const { patientId, reason, ...input } = parsed.data;

  try {
    const requestId = await getRequestId();
    const definition = await updateDefinition({
      id,
      patientId,
      input,
      actorId: sessionOrError.user.id,
      requestId,
      reason: reason || undefined,
    });
    if (!definition) return jsonError("Definice nenalezena.", 404);
    return jsonOk({ definition });
  } catch (err) {
    if (err instanceof ObservationDefinitionServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
