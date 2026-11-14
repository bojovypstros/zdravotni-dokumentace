import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  createHash,
} from "node:crypto";

/** PoC container: AES-256-GCM, key from user password via scrypt. */
export const BACKUP_MAGIC = Buffer.from("ZD1BAK01", "ascii"); // 8 bytes
const SALT_LEN = 16;
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;

export function sha256Hex(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export function encryptBackupPayload(
  plaintext: Buffer,
  password: string,
): Buffer {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = scryptSync(password, salt, KEY_LEN, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([BACKUP_MAGIC, salt, iv, tag, ciphertext]);
}

export function decryptBackupPayload(
  blob: Buffer,
  password: string,
): Buffer {
  if (blob.length < BACKUP_MAGIC.length + SALT_LEN + IV_LEN + TAG_LEN + 1) {
    throw new Error("Neplatný soubor zálohy.");
  }
  const magic = blob.subarray(0, BACKUP_MAGIC.length);
  if (!magic.equals(BACKUP_MAGIC)) {
    throw new Error("Neplatný formát zálohy.");
  }
  let offset = BACKUP_MAGIC.length;
  const salt = blob.subarray(offset, offset + SALT_LEN);
  offset += SALT_LEN;
  const iv = blob.subarray(offset, offset + IV_LEN);
  offset += IV_LEN;
  const tag = blob.subarray(offset, offset + TAG_LEN);
  offset += TAG_LEN;
  const ciphertext = blob.subarray(offset);

  const key = scryptSync(password, salt, KEY_LEN, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("Dešifrování selhalo — špatné heslo nebo poškozená záloha.");
  }
}
