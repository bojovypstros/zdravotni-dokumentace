import type { Document } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  MAX_DOCUMENT_BYTES,
  deleteDocumentFile,
  readDocumentFile,
  sniffDocumentMime,
  writeDocumentFile,
} from "@/lib/storage/documents";
import type { DocumentMetaInput } from "@/lib/validation/document";
import { runAuditedMutation } from "@/server/services/audit";

export class DocumentServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "DocumentServiceError";
    this.status = status;
  }
}

export function serializeDocument(d: Document) {
  return {
    id: d.id,
    patientId: d.patientId,
    originalFileName: d.originalFileName,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    documentType: d.documentType,
    documentDate: d.documentDate
      ? d.documentDate.toISOString().slice(0, 10)
      : null,
    uploadedAt: d.uploadedAt.toISOString(),
    sourceLabel: d.sourceLabel,
    notes: d.notes,
    checksum: d.checksum,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export type SerializedDocument = ReturnType<typeof serializeDocument>;

export async function listDocuments(patientId: string) {
  const rows = await prisma.document.findMany({
    where: { patientId },
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map(serializeDocument);
}

export async function getDocument(id: string) {
  const row = await prisma.document.findUnique({ where: { id } });
  return row ? serializeDocument(row) : null;
}

export async function getDocumentRow(id: string) {
  return prisma.document.findUnique({ where: { id } });
}

export async function createDocument(opts: {
  meta: DocumentMetaInput;
  originalFileName: string;
  declaredMime: string;
  buffer: Buffer;
  actorId: string;
  requestId?: string;
}) {
  if (opts.buffer.length === 0) {
    throw new DocumentServiceError("Prázdný soubor.", 400);
  }
  if (opts.buffer.length > MAX_DOCUMENT_BYTES) {
    throw new DocumentServiceError(
      `Soubor překračuje limit ${MAX_DOCUMENT_BYTES} bajtů (10 MiB).`,
      400,
    );
  }

  const mime = sniffDocumentMime(
    opts.buffer,
    opts.declaredMime,
    opts.originalFileName,
  );
  if (!mime) {
    throw new DocumentServiceError(
      "Povolené typy: PDF, JPEG, PNG (kontrola MIME i přípony).",
      400,
    );
  }

  const patient = await prisma.patient.findUnique({
    where: { id: opts.meta.patientId },
  });
  if (!patient) {
    throw new DocumentServiceError("Pacient nenalezen.", 404);
  }

  const written = await writeDocumentFile({
    patientId: opts.meta.patientId,
    mime,
    buffer: opts.buffer,
  });

  try {
    return await runAuditedMutation({
      patientId: opts.meta.patientId,
      actorId: opts.actorId,
      entityType: "Document",
      action: "create",
      changeSummary: `Upload ${opts.originalFileName}`,
      requestId: opts.requestId,
      mutate: async (tx) => {
        const row = await tx.document.create({
          data: {
            patientId: opts.meta.patientId,
            originalFileName: opts.originalFileName.slice(0, 255),
            storageKey: written.storageKey,
            mimeType: mime,
            sizeBytes: opts.buffer.length,
            documentType: opts.meta.documentType,
            documentDate: opts.meta.documentDate
              ? new Date(`${opts.meta.documentDate}T00:00:00.000Z`)
              : null,
            sourceLabel: opts.meta.sourceLabel || null,
            notes: opts.meta.notes || null,
            checksum: written.checksum,
          },
        });
        return {
          result: serializeDocument(row),
          entityId: row.id,
          after: serializeDocument(row),
        };
      },
    });
  } catch (err) {
    await deleteDocumentFile(written.storageKey);
    throw err;
  }
}

export async function deleteDocument(opts: {
  id: string;
  actorId: string;
  requestId?: string;
}) {
  const existing = await prisma.document.findUnique({ where: { id: opts.id } });
  if (!existing) return null;

  const before = serializeDocument(existing);
  await runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Document",
    action: "archive",
    changeSummary: `Delete ${existing.originalFileName}`,
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      await tx.document.delete({ where: { id: opts.id } });
      return { result: true, entityId: opts.id, after: { deleted: true } };
    },
  });
  await deleteDocumentFile(existing.storageKey);
  return true;
}

export async function openDocumentDownload(id: string) {
  const row = await prisma.document.findUnique({ where: { id } });
  if (!row) return null;
  const buffer = await readDocumentFile(row.storageKey);
  return { row, buffer, meta: serializeDocument(row) };
}
