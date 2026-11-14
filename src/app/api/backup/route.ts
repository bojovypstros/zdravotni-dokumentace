import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireApiSession,
  requireMutatingSession,
} from "@/lib/api/http";
import { AuthError } from "@/lib/auth/session";
import { getRequestId } from "@/lib/security/request-meta";
import { backupPasswordSchema } from "@/lib/validation/export";
import {
  BackupServiceError,
  createEncryptedBackup,
  listBackupFiles,
  readBackupFile,
} from "@/server/services/backup";

export async function GET() {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }
  const backups = await listBackupFiles();
  return jsonOk({ backups });
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

  const parsed = backupPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Heslo je povinné (min. 8 znaků).", 400);
  }

  try {
    const requestId = await getRequestId();
    const result = await createEncryptedBackup({
      password: parsed.data.password,
      actorId: sessionOrError.user.id,
      requestId,
    });

    const download = new URL(request.url).searchParams.get("download");
    if (download === "1") {
      const blob = await readBackupFile(result.fileName);
      return new Response(new Uint8Array(blob), {
        status: 201,
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename="${result.fileName}"`,
          "Cache-Control": "no-store",
          "X-Backup-File-Name": result.fileName,
        },
      });
    }

    return jsonOk(
      {
        ok: true,
        fileName: result.fileName,
        sizeBytes: result.sizeBytes,
        manifest: result.manifest,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof BackupServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
