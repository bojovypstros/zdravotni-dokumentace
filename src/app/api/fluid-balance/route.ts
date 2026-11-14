import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireApiSession,
  requireMutatingSession,
} from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { DEFAULT_TIMEZONE } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import { getRequestId } from "@/lib/security/request-meta";
import {
  fluidBalanceWriteSchema,
  fluidDirectionSchema,
} from "@/lib/validation/fluid";
import {
  FluidServiceError,
  createFluidBalanceEntry,
  listFluidBalanceEntries,
  summarizeFluidByDay,
} from "@/server/services/fluid";

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

  const directionRaw = url.searchParams.get("direction");
  let direction: ReturnType<typeof fluidDirectionSchema.parse> | undefined;
  if (directionRaw) {
    const parsed = fluidDirectionSchema.safeParse(directionRaw);
    if (!parsed.success) return jsonError("Neplatný direction.", 400);
    direction = parsed.data;
  }

  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const limitRaw = url.searchParams.get("limit");
  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    return jsonError("Neplatný parametr from.", 400);
  }
  if (to && Number.isNaN(to.getTime())) {
    return jsonError("Neplatný parametr to.", 400);
  }

  const entries = await listFluidBalanceEntries({
    patientId,
    from,
    to,
    direction,
    limit: limitRaw ? Number(limitRaw) : undefined,
  });

  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { timezone: true },
  });
  const timeZone = patient?.timezone ?? DEFAULT_TIMEZONE;
  const daily = summarizeFluidByDay(entries, timeZone);

  return jsonOk({ entries, daily, timeZone });
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

  const parsed = fluidBalanceWriteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const entry = await createFluidBalanceEntry({
      input: parsed.data,
      actorId: sessionOrError.user.id,
      requestId,
    });
    if (!entry) return jsonError("Pacient nenalezen.", 404);
    return jsonOk({ entry }, { status: 201 });
  } catch (err) {
    if (err instanceof FluidServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
