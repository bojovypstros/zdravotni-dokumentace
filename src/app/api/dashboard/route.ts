import { connection } from "next/server";

import { jsonError, jsonOk, requireApiSession } from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import {
  getDashboard,
  type DashboardTrendRange,
} from "@/server/services/dashboard";

const TREND_RANGES = new Set<DashboardTrendRange>(["7d", "30d", "90d"]);

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

  const trendRaw = url.searchParams.get("trendRange") ?? "30d";
  if (!TREND_RANGES.has(trendRaw as DashboardTrendRange)) {
    return jsonError("Neplatný trendRange (7d|30d|90d).", 400);
  }

  const limitRaw = url.searchParams.get("recentLimit");
  const recentLimit = limitRaw ? Number(limitRaw) : undefined;
  if (recentLimit !== undefined && (!Number.isFinite(recentLimit) || recentLimit < 1)) {
    return jsonError("Neplatný recentLimit.", 400);
  }

  const dashboard = await getDashboard({
    patientId,
    trendRange: trendRaw as DashboardTrendRange,
    recentLimit,
  });
  if (!dashboard) return jsonError("Pacient nenalezen.", 404);
  return jsonOk({ dashboard });
}
