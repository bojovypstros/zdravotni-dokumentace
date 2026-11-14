"use client";

import { CSRF_COOKIE } from "@/lib/auth/cookie-names";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers.set("x-csrf-token", csrf);
    if (!headers.has("content-type") && init.body) {
      headers.set("content-type", "application/json");
    }
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
