import { connection } from "next/server";
import { NextResponse } from "next/server";

import {
  isNextResponse,
  jsonError,
  requireApiSession,
  requireMutatingSession,
} from "@/lib/api/http";
import { setActivePatientCookieOn } from "@/lib/auth/active-patient";
import { AuthError } from "@/lib/auth/session";
import { getRequestId } from "@/lib/security/request-meta";
import { patientCreateMinimalSchema } from "@/lib/validation/patient-create";
import { patientWriteSchema } from "@/lib/validation/patient";
import {
  createPatient,
  listPatients,
} from "@/server/services/patient";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") ?? undefined;
  const patients = await listPatients({ query });
  return NextResponse.json({ patients });
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

  const full = patientWriteSchema.safeParse(body);
  const minimal = patientCreateMinimalSchema.safeParse(body);

  let input;
  if (full.success) {
    input = full.data;
  } else if (minimal.success) {
    const m = minimal.data;
    input = patientWriteSchema.parse({
      displayName: m.displayName,
      preferredName: m.preferredName || m.displayName,
      givenName: m.givenName || "",
      familyName: m.familyName || "",
      birthDate: m.birthDate || "",
      phone: m.phone || "",
      email: m.email || "",
      timezone: "Europe/Prague",
      addressForm: "preferred_name",
      noKnownAllergies: false,
      isActive: true,
    });
  } else {
    return jsonError("Neplatný vstup.", 400, {
      issues: full.error?.flatten() ?? minimal.error?.flatten(),
    });
  }

  const requestId = await getRequestId();
  const patient = await createPatient({
    input,
    actorId: sessionOrError.user.id,
    requestId,
  });

  const response = NextResponse.json({ patient }, { status: 201 });
  await setActivePatientCookieOn(response, patient.id);
  return response;
}
