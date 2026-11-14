import { connection } from "next/server";

import { jsonError, requireApiSession } from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { getRequestId } from "@/lib/security/request-meta";
import { exportQuerySchema } from "@/lib/validation/export";
import {
  ExportServiceError,
  buildPdfExport,
} from "@/server/services/export";
import { resolveExportRange } from "@/server/services/export-range";

export async function GET(request: Request) {
  await connection();
  let session;
  try {
    session = await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const url = new URL(request.url);
  const parsed = exportQuerySchema.safeParse({
    patientId: url.searchParams.get("patientId"),
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    fromDate: url.searchParams.get("fromDate") || undefined,
    toDate: url.searchParams.get("toDate") || undefined,
  });
  if (!parsed.success) {
    return jsonError("Neplatné parametry exportu.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const range = await resolveExportRange(parsed.data);
    const requestId = await getRequestId();
    const result = await buildPdfExport({
      patientId: parsed.data.patientId,
      range,
      actorId: session.user.id,
      requestId,
    });
    return new Response(new Uint8Array(result.body), {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
        "Cache-Control": "no-store",
        "X-Export-Generated-At": result.meta.generatedAt,
        "X-Export-Time-Zone": result.meta.timeZone,
      },
    });
  } catch (err) {
    if (err instanceof ExportServiceError) {
      return jsonError(err.message, err.status);
    }
    if (err instanceof Error && err.message.startsWith("Neplatný")) {
      return jsonError(err.message, 400);
    }
    throw err;
  }
}
