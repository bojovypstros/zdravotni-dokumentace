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
import { MAX_DOCUMENT_BYTES } from "@/lib/storage/documents";
import { documentMetaSchema } from "@/lib/validation/document";
import {
  DocumentServiceError,
  createDocument,
  listDocuments,
} from "@/server/services/document";

export async function GET(request: Request) {
  await connection();
  try {
    await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  const patientId = new URL(request.url).searchParams.get("patientId");
  if (!patientId) return jsonError("Chybí patientId.", 400);

  const documents = await listDocuments(patientId);
  return jsonOk({ documents });
}

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

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError("Chybí soubor (pole file).", 400);
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    return jsonError("Soubor překračuje limit 10 MiB.", 400);
  }

  const metaParsed = documentMetaSchema.safeParse({
    patientId: form.get("patientId"),
    documentType: form.get("documentType") || "other",
    documentDate: form.get("documentDate") || null,
    sourceLabel: form.get("sourceLabel") || null,
    notes: form.get("notes") || null,
  });
  if (!metaParsed.success) {
    return jsonError("Neplatná metadata.", 400, {
      issues: metaParsed.error.flatten(),
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const requestId = await getRequestId();
    const document = await createDocument({
      meta: metaParsed.data,
      originalFileName: file.name || "upload.bin",
      declaredMime: file.type || "application/octet-stream",
      buffer,
      actorId: sessionOrError.user.id,
      requestId,
    });
    return jsonOk({ document }, { status: 201 });
  } catch (err) {
    if (err instanceof DocumentServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
