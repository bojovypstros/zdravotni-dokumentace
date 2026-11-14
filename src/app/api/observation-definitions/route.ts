import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireApiSession,
  requireMutatingSession,
} from "@/lib/api/http";
import {
  CLINICAL_CATALOG_FORBIDDEN_MESSAGE,
  canManageClinicalCatalog,
} from "@/lib/auth/roles";
import { AuthError } from "@/lib/auth/session";
import { getRequestId } from "@/lib/security/request-meta";
import { observationDefinitionCreateSchema } from "@/lib/validation/observation";
import {
  ObservationDefinitionServiceError,
  createCustomDefinition,
  listAllDefinitionsForPatient,
  listDefinitionsForPatient,
} from "@/server/services/observation-definition";

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

  const includeInactive = url.searchParams.get("includeInactive") === "1";
  const definitions = includeInactive
    ? await listAllDefinitionsForPatient(patientId)
    : await listDefinitionsForPatient(patientId);
  return jsonOk({ definitions });
}

export async function POST(request: Request) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  if (!canManageClinicalCatalog(sessionOrError.user.role)) {
    return jsonError(CLINICAL_CATALOG_FORBIDDEN_MESSAGE, 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Neplatné JSON tělo.", 400);
  }

  const parsed = observationDefinitionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const definition = await createCustomDefinition({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!definition) return jsonError("Pacient nenalezen.", 404);
    return jsonOk({ definition }, { status: 201 });
  } catch (err) {
    if (err instanceof ObservationDefinitionServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
