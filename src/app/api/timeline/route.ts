import { connection } from "next/server";

import {
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { ALL_TIMELINE_EVENT_TYPES } from "@/lib/timeline/types";
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
  const groupByDayRaw = url.searchParams.get("groupByDay");
  const timeZone = url.searchParams.get("timeZone") ?? undefined;

  const from = fromRaw ? new Date(fromRaw) : undefined;
  const to = toRaw ? new Date(toRaw) : undefined;
  if (from && Number.isNaN(from.getTime())) {
    return jsonError("Neplatný parametr from.", 400);
  }
  if (to && Number.isNaN(to.getTime())) {
    return jsonError("Neplatný parametr to.", 400);
  }

  let types: TimelineEventType[] | undefined;
  if (typesRaw) {
    const requested = typesRaw.split(",").filter(Boolean) as TimelineEventType[];
    const allowed = new Set(ALL_TIMELINE_EVENT_TYPES);
    const invalid = requested.filter((t) => !allowed.has(t));
    if (invalid.length > 0) {
      return jsonError(`Neplatný typ: ${invalid.join(", ")}`, 400);
    }
    types = requested;
  }

  const groupByDay =
    groupByDayRaw === null || groupByDayRaw === undefined
      ? true
      : groupByDayRaw !== "0" && groupByDayRaw !== "false";

  const result = await listTimelineEvents({
    patientId,
    from,
    to,
    types,
    limit: limitRaw ? Number(limitRaw) : 50,
    offset: offsetRaw ? Number(offsetRaw) : 0,
    groupByDay,
    timeZone,
  });

  return jsonOk(result);
}
