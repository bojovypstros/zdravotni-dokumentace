import { connection } from "next/server";

import { jsonError, requireApiSession } from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { readBackupFile } from "@/server/services/backup";

type Ctx = { params: Promise<{ fileName: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const { fileName: raw } = await ctx.params;
  const fileName = decodeURIComponent(raw);
  if (!fileName.endsWith(".zdbackup") || fileName.includes("/") || fileName.includes("..")) {
    return jsonError("Neplatný název zálohy.", 400);
  }

  try {
    const blob = await readBackupFile(fileName);
    return new Response(new Uint8Array(blob), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return jsonError("Záloha nenalezena.", 404);
  }
}
