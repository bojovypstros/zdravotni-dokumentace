import { connection } from "next/server";

import {
  jsonError,
  jsonOk,
  requireApiSession,
} from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { listLabAnalyteDefinitions } from "@/server/services/lab-analyte-definition";
import { LAB_PANEL_PRESETS } from "@/server/services/lab-catalog";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("activeOnly") === "1";
  const definitions = await listLabAnalyteDefinitions({ activeOnly });

  return jsonOk({
    definitions,
    presets: LAB_PANEL_PRESETS.map((p) => ({
      key: p.key,
      label: p.label,
      analyteKeys: [...p.analyteKeys],
    })),
  });
}
