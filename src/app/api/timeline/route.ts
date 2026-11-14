import { connection } from "next/server";

import {
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import {
  listTimelineEvents,
  type TimelineEventType,
} from "@/server/services/timeline";

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

  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const typesRaw = url.searchParams.get("types");

  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    return jsonError("Neplatný parametr from.", 400);
  }
  if (to && Number.isNaN(to.getTime())) {
    return jsonError("Neplatný parametr to.", 400);
  }

  const types = typesRaw
    ? (typesRaw.split(",").filter(Boolean) as TimelineEventType[])
    : undefined;

  const result = await listTimelineEvents({
    patientId,
    from,
    to,
    types,
    limit: limitRaw ? Number(limitRaw) : 100,
    offset: offsetRaw ? Number(offsetRaw) : 0,
  });

  return jsonOk(result);
}
