import { headers } from "next/headers";

export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip");
}

export async function getUserAgentSummary(): Promise<string | null> {
  const h = await headers();
  const ua = h.get("user-agent");
  if (!ua) return null;
  return ua.slice(0, 180);
}

export async function getRequestId(): Promise<string | undefined> {
  const h = await headers();
  return h.get("x-request-id") ?? undefined;
}

/**
 * Basic host/origin check for mutating cookie-auth requests.
 * Allows same-origin APP_URL host and localhost for local verification.
 */
export async function assertTrustedOrigin(): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  const h = await headers();
  const origin = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");

  if (!origin) {
    // Same-site navigations / non-browser clients may omit Origin.
    // CSRF token still required for mutations.
    return { ok: true };
  }

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return { ok: false, status: 403, error: "Neplatný Origin." };
  }

  const appUrl = process.env.APP_URL;
  const allowed = new Set<string>();
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).host);
    } catch {
      /* ignore malformed APP_URL */
    }
  }
  if (host) allowed.add(host);
  allowed.add("127.0.0.1:3000");
  allowed.add("localhost:3000");

  if (!allowed.has(originHost)) {
    return { ok: false, status: 403, error: "Origin není povolen." };
  }
  return { ok: true };
}
