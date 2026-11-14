import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink, readFile } from "node:fs/promises";
import path from "node:path";

import {
  documentsRoot,
  resolveDocumentPath,
} from "@/lib/storage/paths";

/** Gate / research lock: pdf/jpeg/png, max 10 MiB. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type AllowedDocumentMime = (typeof ALLOWED_DOCUMENT_MIME)[number];

const EXT_BY_MIME: Record<AllowedDocumentMime, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

const MIME_BY_EXT: Record<string, AllowedDocumentMime> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

export function isAllowedDocumentMime(
  mime: string,
): mime is AllowedDocumentMime {
  return (ALLOWED_DOCUMENT_MIME as readonly string[]).includes(mime);
}

export function sniffDocumentMime(
  buffer: Buffer,
  declaredMime: string,
  fileName: string,
): AllowedDocumentMime | null {
  const ext = path.extname(fileName).toLowerCase();
  const fromExt = MIME_BY_EXT[ext];

  let sniffed: AllowedDocumentMime | null = null;
  if (buffer.length >= 4) {
    if (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      sniffed = "application/pdf";
    } else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      sniffed = "image/jpeg";
    } else if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      sniffed = "image/png";
    }
  }

  if (!sniffed) return null;
  if (!isAllowedDocumentMime(declaredMime)) return null;
  if (declaredMime !== sniffed) return null;
  if (fromExt && fromExt !== sniffed) return null;
  return sniffed;
}

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function ensureDocumentsDir(patientId: string): Promise<string> {
  const dir = path.join(documentsRoot(), patientId);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeDocumentFile(opts: {
  patientId: string;
  mime: AllowedDocumentMime;
  buffer: Buffer;
}): Promise<{ storageKey: string; absolutePath: string; checksum: string }> {
  await ensureDocumentsDir(opts.patientId);
  const id = randomUUID();
  const storageKey = `${opts.patientId}/${id}${EXT_BY_MIME[opts.mime]}`;
  const absolutePath = resolveDocumentPath(storageKey);
  await writeFile(absolutePath, opts.buffer, { flag: "wx" });
  return {
    storageKey: storageKey.replaceAll("\\", "/"),
    absolutePath,
    checksum: sha256Hex(opts.buffer),
  };
}

export async function readDocumentFile(storageKey: string): Promise<Buffer> {
  const absolutePath = resolveDocumentPath(storageKey);
  return readFile(absolutePath);
}

export async function deleteDocumentFile(storageKey: string): Promise<void> {
  const absolutePath = resolveDocumentPath(storageKey);
  await unlink(absolutePath).catch(() => undefined);
}
