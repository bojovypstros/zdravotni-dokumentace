import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { headers } from "next/headers";

import { CSRF_COOKIE, SESSION_COOKIE } from "@/lib/auth/cookie-names";

export { CSRF_COOKIE, SESSION_COOKIE };

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

/**
 * Secure cookie flag:
 * - honor FORCE_SECURE_COOKIES
 * - trust X-Forwarded-Proto from reverse proxy
 * - localhost / 127.0.0.1 stays non-Secure for local HTTP verify
 * - else follow APP_URL scheme
 */
export async function resolveSecureCookies(): Promise<boolean> {
  if (process.env.FORCE_SECURE_COOKIES === "true") return true;
  if (process.env.FORCE_SECURE_COOKIES === "false") return false;

  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (proto === "https") return true;
  if (proto === "http") return false;

  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").toLowerCase();
  if (host.startsWith("127.0.0.1") || host.startsWith("localhost")) {
    return false;
  }

  return (process.env.APP_URL ?? "").startsWith("https://");
}

export async function sessionCookieOptions(
  maxAge = SESSION_MAX_AGE_SECONDS,
): Promise<Partial<ResponseCookie>> {
  return {
    httpOnly: true,
    secure: await resolveSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export async function csrfCookieOptions(
  maxAge = SESSION_MAX_AGE_SECONDS,
): Promise<Partial<ResponseCookie>> {
  return {
    httpOnly: false,
    secure: await resolveSecureCookies(),
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

export { SESSION_MAX_AGE_SECONDS };
