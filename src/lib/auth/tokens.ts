import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const pepper = process.env.SESSION_SECRET?.trim();
  if (!pepper || pepper.includes("CHANGE_ME")) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET není nastaven.");
    }
    return createHash("sha256").update(`dev-ip-hash:${ip}`).digest("hex");
  }
  return createHash("sha256").update(`${pepper}:${ip}`).digest("hex");
}
