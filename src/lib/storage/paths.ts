import path from "node:path";

/** Private runtime storage root (outside public/). */
export function storageRoot(): string {
  const fromEnv = process.env.STORAGE_ROOT?.trim();
  if (fromEnv) return path.resolve(/*turbopackIgnore: true*/ fromEnv);
  return path.resolve(
    /*turbopackIgnore: true*/ process.cwd(),
    "storage",
  );
}

export function documentsRoot(): string {
  return path.join(/*turbopackIgnore: true*/ storageRoot(), "documents");
}

export function backupsRoot(): string {
  return path.join(/*turbopackIgnore: true*/ storageRoot(), "backups");
}

/** Resolve a storage key under documents/; rejects path traversal. */
export function resolveDocumentPath(storageKey: string): string {
  const root = path.resolve(/*turbopackIgnore: true*/ documentsRoot());
  const resolved = path.resolve(/*turbopackIgnore: true*/ root, storageKey);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Neplatný storageKey.");
  }
  return resolved;
}

export function resolveBackupPath(fileName: string): string {
  const root = path.resolve(/*turbopackIgnore: true*/ backupsRoot());
  const base = path.basename(fileName);
  if (base !== fileName || base.includes("..")) {
    throw new Error("Neplatný název zálohy.");
  }
  const resolved = path.resolve(/*turbopackIgnore: true*/ root, base);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("Neplatný název zálohy.");
  }
  return resolved;
}
