import { connection } from "next/server";

import { jsonError, requireApiSession } from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { openDocumentDownload } from "@/server/services/document";

type Ctx = { params: Promise<{ id: string }> };

/** Authorized download only — never publicly served from /storage. */
export async function GET(_request: Request, ctx: Ctx) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const { id } = await ctx.params;
  const opened = await openDocumentDownload(id);
  if (!opened) return jsonError("Dokument nenalezen.", 404);

  const asciiName = opened.row.originalFileName.replace(/[^\x20-\x7E]/g, "_");
  const encoded = encodeURIComponent(opened.row.originalFileName);

  return new Response(new Uint8Array(opened.buffer), {
    status: 200,
    headers: {
      "Content-Type": opened.row.mimeType,
      "Content-Length": String(opened.buffer.length),
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
