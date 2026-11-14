import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireMutatingSession,
} from "@/lib/api/http";
import { getRequestId } from "@/lib/security/request-meta";
import {
  BackupServiceError,
  restoreEncryptedBackup,
} from "@/server/services/backup";

export async function POST(request: Request) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Očekáván multipart/form-data.", 400);
  }

  const password = form.get("password");
  if (typeof password !== "string" || password.length < 8) {
    return jsonError("Heslo je povinné (min. 8 znaků).", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Chybí soubor zálohy (pole file).", 400);
  }

  const blob = Buffer.from(await file.arrayBuffer());
  try {
    const requestId = await getRequestId();
    const result = await restoreEncryptedBackup({
      password,
      blob,
      actorId: sessionOrError.user.id,
      requestId,
      restoreDocuments: true,
    });
    return jsonOk(result);
  } catch (err) {
    if (err instanceof BackupServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
