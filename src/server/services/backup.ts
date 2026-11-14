import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile, readdir, cp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { verifyPassword } from "@/lib/auth/password";
import {
  decryptBackupPayload,
  encryptBackupPayload,
  sha256Hex,
} from "@/lib/crypto/backup-cipher";
import { DEFAULT_TIMEZONE } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import {
  backupsRoot,
  resolveBackupPath,
  resolveDocumentPath,
} from "@/lib/storage/paths";
import { createAuditEvent } from "@/server/services/audit";

const execFileAsync = promisify(execFile);

export class BackupServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BackupServiceError";
    this.status = status;
  }
}

const SCHEMA_VERSION = "phase8";
const APP_NAME = "zdravotni-dokumentace";

type BackupManifest = {
  formatVersion: 1;
  schemaVersion: string;
  app: string;
  createdAt: string;
  timeZone: string;
  documentCount: number;
  plaintextChecksum: string;
  includesPgDump: boolean;
  includesDocumentFiles: boolean;
  note: string;
};

async function untarArchive(tarGz: string, destDir: string) {
  await mkdir(destDir, { recursive: true });
  await execFileAsync(
    "tar",
    ["-xzf", tarGz, "-C", destDir],
    { maxBuffer: 64 * 1024 * 1024 },
  );
}

function parseDatabaseUrl(url: string) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: u.port || "5432",
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, "").split("?")[0],
  };
}

async function runPgDump(outSqlPath: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new BackupServiceError("DATABASE_URL není nastavena.", 500);
  }
  const cfg = parseDatabaseUrl(databaseUrl);
  const env = {
    ...process.env,
    PGPASSWORD: cfg.password,
  };
  await execFileAsync(
    "pg_dump",
    [
      "-h",
      cfg.host,
      "-p",
      cfg.port,
      "-U",
      cfg.user,
      "-d",
      cfg.database,
      "--no-owner",
      "--no-acl",
      "-f",
      outSqlPath,
    ],
    { env, maxBuffer: 128 * 1024 * 1024 },
  );
}

async function exportJsonSnapshot(outPath: string) {
  const [
    users,
    patients,
    diagnoses,
    allergies,
    observationDefinitions,
    observations,
    medicationOrders,
    medicationAdministrations,
    clinicalNotes,
    symptomEntries,
    diaryScaleDefinitions,
    diaryScaleSettings,
    diaryScaleReadings,
    documents,
    appMeta,
    auditEvents,
  ] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        username: true,
        passwordHash: true,
        displayName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.patient.findMany(),
    prisma.diagnosis.findMany(),
    prisma.allergy.findMany(),
    prisma.observationDefinition.findMany(),
    prisma.observation.findMany(),
    prisma.medicationOrder.findMany(),
    prisma.medicationAdministration.findMany(),
    prisma.clinicalNote.findMany(),
    prisma.symptomEntry.findMany(),
    prisma.diaryScaleDefinition.findMany(),
    prisma.diaryScaleSetting.findMany(),
    prisma.diaryScaleReading.findMany(),
    prisma.document.findMany(),
    prisma.appMeta.findMany(),
    prisma.auditEvent.findMany({ take: 5000, orderBy: { occurredAt: "desc" } }),
  ]);

  const snapshot = {
    exportedAt: new Date().toISOString(),
    users,
    patients,
    diagnoses,
    allergies,
    observationDefinitions,
    observations,
    medicationOrders,
    medicationAdministrations,
    clinicalNotes,
    symptomEntries,
    diaryScaleDefinitions,
    diaryScaleSettings,
    diaryScaleReadings,
    documents,
    appMeta,
    auditEvents,
  };

  await writeFile(outPath, JSON.stringify(snapshot, null, 2), "utf8");
  return snapshot.documents.length;
}

async function copyDocumentFiles(stagingDocs: string) {
  await mkdir(stagingDocs, { recursive: true });
  const docs = await prisma.document.findMany();
  for (const d of docs) {
    const src = resolveDocumentPath(d.storageKey);
    const dest = path.join(stagingDocs, d.storageKey);
    await mkdir(path.dirname(dest), { recursive: true });
    await cp(src, dest).catch(() => undefined);
  }
  return docs.length;
}

export async function createEncryptedBackup(opts: {
  password: string;
  actorId: string;
  requestId?: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: opts.actorId } });
  if (!user) throw new BackupServiceError("Uživatel nenalezen.", 404);

  const ok = await verifyPassword(user.passwordHash, opts.password);
  if (!ok) {
    throw new BackupServiceError("Neplatné heslo.", 401);
  }

  const patient = await prisma.patient.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  const timeZone = patient?.timezone ?? DEFAULT_TIMEZONE;

  await mkdir(backupsRoot(), { recursive: true });
  const staging = await mkdtemp(path.join(os.tmpdir(), "zd-bak-"));
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const fileName = `backup-${stamp}.zdbackup`;
  const outPath = resolveBackupPath(fileName);

  try {
    const dumpSql = path.join(staging, "database.sql");
    const snapshotJson = path.join(staging, "data.json");
    const docsDir = path.join(staging, "documents");

    await runPgDump(dumpSql);
    const documentCount = await exportJsonSnapshot(snapshotJson);
    await copyDocumentFiles(docsDir);

    const manifestDraft: Omit<BackupManifest, "plaintextChecksum"> = {
      formatVersion: 1,
      schemaVersion: SCHEMA_VERSION,
      app: APP_NAME,
      createdAt: new Date().toISOString(),
      timeZone,
      documentCount,
      includesPgDump: true,
      includesDocumentFiles: true,
      note: "PoC encrypted backup (AES-256-GCM, key from user password via scrypt).",
    };

    // Temporary checksum placeholder — hash whole staging tar contents.
    await writeFile(
      path.join(staging, "manifest.json"),
      JSON.stringify({ ...manifestDraft, plaintextChecksum: "" }, null, 2),
    );

    const tarPath = path.join(staging, "payload.tar.gz");
    // Exclude the tar itself if re-run; build from known members.
    const members = ["manifest.json", "database.sql", "data.json", "documents"];
    await execFileAsync(
      "tar",
      ["-czf", tarPath, "-C", staging, ...members],
      { maxBuffer: 128 * 1024 * 1024 },
    );

    const plaintext = await readFile(tarPath);
    const plaintextChecksum = sha256Hex(plaintext);
    const manifest: BackupManifest = {
      ...manifestDraft,
      plaintextChecksum,
    };
    await writeFile(
      path.join(staging, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );

    // Rebuild tar with final manifest checksum.
    await execFileAsync(
      "tar",
      ["-czf", tarPath, "-C", staging, ...members],
      { maxBuffer: 128 * 1024 * 1024 },
    );
    const finalPlaintext = await readFile(tarPath);
    const encrypted = encryptBackupPayload(finalPlaintext, opts.password);
    await writeFile(outPath, encrypted);

    await createAuditEvent(prisma, {
      patientId: patient?.id ?? null,
      actorId: opts.actorId,
      entityType: "Backup",
      entityId: fileName,
      action: "backup",
      changeSummary: "Encrypted backup created",
      after: {
        fileName,
        sizeBytes: encrypted.length,
        documentCount,
        createdAt: manifest.createdAt,
        timeZone,
      },
      requestId: opts.requestId,
    });

    return {
      fileName,
      sizeBytes: encrypted.length,
      manifest,
      absolutePath: outPath,
    };
  } catch (err) {
    await rm(outPath, { force: true }).catch(() => undefined);
    if (err instanceof BackupServiceError) throw err;
    const message =
      err instanceof Error ? err.message : "Vytvoření zálohy selhalo.";
    throw new BackupServiceError(message, 500);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

export async function readBackupFile(fileName: string) {
  const absolutePath = resolveBackupPath(fileName);
  return readFile(absolutePath);
}

export async function listBackupFiles() {
  await mkdir(backupsRoot(), { recursive: true });
  const names = await readdir(backupsRoot());
  return names.filter((n) => n.endsWith(".zdbackup")).sort().reverse();
}

/**
 * Restore PoC:
 * 1) verify password decrypts backup
 * 2) verify archive extracts
 * 3) restore document files + Document metadata from data.json
 * Does NOT wipe/replace the live PostgreSQL via pg_restore automatically
 * (destructive). SQL dump remains in the archive for ops recovery.
 */
export async function restoreEncryptedBackup(opts: {
  password: string;
  blob: Buffer;
  actorId: string;
  requestId?: string;
  /** When true, also upsert Document rows + files from backup. */
  restoreDocuments?: boolean;
}) {
  const user = await prisma.user.findUnique({ where: { id: opts.actorId } });
  if (!user) throw new BackupServiceError("Uživatel nenalezen.", 404);

  // Identity check: current account password must match (PoC).
  const identityOk = await verifyPassword(user.passwordHash, opts.password);
  if (!identityOk) {
    throw new BackupServiceError("Neplatné heslo.", 401);
  }

  let plaintext: Buffer;
  try {
    plaintext = decryptBackupPayload(opts.blob, opts.password);
  } catch (err) {
    throw new BackupServiceError(
      err instanceof Error ? err.message : "Dešifrování selhalo.",
      400,
    );
  }

  const staging = await mkdtemp(path.join(os.tmpdir(), "zd-restore-"));
  const tarPath = path.join(staging, "payload.tar.gz");
  const extractDir = path.join(staging, "extract");

  try {
    await writeFile(tarPath, plaintext);
    await untarArchive(tarPath, extractDir);

    const manifestRaw = await readFile(
      path.join(extractDir, "manifest.json"),
      "utf8",
    );
    const manifest = JSON.parse(manifestRaw) as BackupManifest;
    if (manifest.formatVersion !== 1 || manifest.app !== APP_NAME) {
      throw new BackupServiceError("Nepodporovaný formát zálohy.", 400);
    }

    const hasSql = await readFile(path.join(extractDir, "database.sql"), "utf8")
      .then((s) => s.length > 0)
      .catch(() => false);
    const hasData = await readFile(path.join(extractDir, "data.json"), "utf8")
      .then((s) => s.length > 0)
      .catch(() => false);

    let restoredDocuments = 0;
    if (opts.restoreDocuments !== false && hasData) {
      const data = JSON.parse(
        await readFile(path.join(extractDir, "data.json"), "utf8"),
      ) as {
        documents?: Array<{
          id: string;
          patientId: string;
          originalFileName: string;
          storageKey: string;
          mimeType: string;
          sizeBytes: number;
          documentType: string;
          documentDate: string | null;
          uploadedAt: string;
          sourceLabel: string | null;
          notes: string | null;
          checksum: string;
          createdAt: string;
          updatedAt: string;
        }>;
      };

      const docsRootBackup = path.join(extractDir, "documents");
      for (const d of data.documents ?? []) {
        const src = path.join(docsRootBackup, d.storageKey);
        const dest = resolveDocumentPath(d.storageKey);
        await mkdir(path.dirname(dest), { recursive: true });
        await cp(src, dest).catch(() => undefined);

        await prisma.document.upsert({
          where: { id: d.id },
          create: {
            id: d.id,
            patientId: d.patientId,
            originalFileName: d.originalFileName,
            storageKey: d.storageKey,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            documentType: d.documentType,
            documentDate: d.documentDate ? new Date(d.documentDate) : null,
            uploadedAt: new Date(d.uploadedAt),
            sourceLabel: d.sourceLabel,
            notes: d.notes,
            checksum: d.checksum,
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt),
          },
          update: {
            originalFileName: d.originalFileName,
            storageKey: d.storageKey,
            mimeType: d.mimeType,
            sizeBytes: d.sizeBytes,
            documentType: d.documentType,
            documentDate: d.documentDate ? new Date(d.documentDate) : null,
            sourceLabel: d.sourceLabel,
            notes: d.notes,
            checksum: d.checksum,
          },
        });
        restoredDocuments += 1;
      }
    }

    await createAuditEvent(prisma, {
      actorId: opts.actorId,
      entityType: "Backup",
      entityId: manifest.createdAt,
      action: "restore",
      changeSummary: "Encrypted backup restored (documents PoC)",
      after: {
        createdAt: manifest.createdAt,
        restoredDocuments,
        hasSql,
        hasData,
        schemaVersion: manifest.schemaVersion,
      },
      requestId: opts.requestId,
    });

    return {
      ok: true as const,
      manifest,
      restoredDocuments,
      hasPgDump: hasSql,
      hasDataJson: hasData,
      note:
        "Dokumenty obnoveny z archivu. SQL dump je součástí zálohy pro ops obnovu DB (automaticky se nespouští).",
    };
  } catch (err) {
    if (err instanceof BackupServiceError) throw err;
    throw new BackupServiceError(
      err instanceof Error ? err.message : "Obnova selhala.",
      500,
    );
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
