import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { NextResponse } from "next/server";

import {
  ACTIVE_PATIENT_COOKIE,
  resolveSecureCookies,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/auth/cookies";
import { prisma } from "@/lib/db/prisma";
import { listPatients, serializePatient } from "@/server/services/patient";

export type ActivePatient = ReturnType<typeof serializePatient>;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function activePatientCookieOptions(
  maxAge = SESSION_MAX_AGE_SECONDS,
): Promise<Partial<ResponseCookie>> {
  return {
    httpOnly: true,
    secure: await resolveSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export async function readActivePatientIdFromCookies(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(ACTIVE_PATIENT_COOKIE)?.value?.trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

/**
 * Resolve the staff's active patient for clinic pages.
 * Migration-friendly: if cookie missing/invalid, fall back to oldest active
 * patient (preserves existing single-patient MVP data).
 */
export async function resolveActivePatient(): Promise<ActivePatient | null> {
  const cookieId = await readActivePatientIdFromCookies();
  if (cookieId) {
    const row = await prisma.patient.findUnique({ where: { id: cookieId } });
    if (row) return serializePatient(row);
  }

  const patients = await listPatients();
  return patients.find((p) => p.isActive) ?? patients[0] ?? null;
}

export async function setActivePatientCookieOn(
  response: NextResponse,
  patientId: string,
): Promise<NextResponse> {
  response.cookies.set(
    ACTIVE_PATIENT_COOKIE,
    patientId,
    await activePatientCookieOptions(),
  );
  return response;
}

export async function clearActivePatientCookieOn(
  response: NextResponse,
): Promise<NextResponse> {
  response.cookies.set(ACTIVE_PATIENT_COOKIE, "", {
    ...(await activePatientCookieOptions(0)),
    maxAge: 0,
  });
  return response;
}
