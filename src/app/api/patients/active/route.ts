import { connection } from "next/server";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireApiSession,
  requireMutatingSession,
} from "@/lib/api/http";
import {
  resolveActivePatient,
  setActivePatientCookieOn,
} from "@/lib/auth/active-patient";
import { AuthError } from "@/lib/auth/session";
import { setActivePatientSchema } from "@/lib/validation/staff";
import { getPatient } from "@/server/services/patient";

export async function GET() {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const patient = await resolveActivePatient();
  return jsonOk({ patient });
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

  const parsed = setActivePatientSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  const patient = await getPatient(parsed.data.patientId);
  if (!patient) return jsonError("Pacient nenalezen.", 404);

  const response = NextResponse.json({ patient });
  await setActivePatientCookieOn(response, patient.id);
  return response;
}
