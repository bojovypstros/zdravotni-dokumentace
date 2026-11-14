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
import { allergyWriteSchema } from "@/lib/validation/allergy";
import {
  AllergyServiceError,
  createAllergy,
  listAllergies,
} from "@/server/services/allergy";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const patientId = new URL(request.url).searchParams.get("patientId");
  if (!patientId) {
    return jsonError("Chybí patientId.", 400);
  }

  const allergies = await listAllergies(patientId);
  return jsonOk({ allergies });
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

  const parsed = allergyWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const allergy = await createAllergy({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!allergy) return jsonError("Pacient nenalezen.", 404);
    return jsonOk({ allergy }, { status: 201 });
  } catch (err) {
    if (err instanceof AllergyServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
