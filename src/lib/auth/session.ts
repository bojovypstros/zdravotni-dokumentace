import { cookies } from "next/headers";

import { SESSION_COOKIE } from "@/lib/auth/cookies";
import {
  generateOpaqueToken,
  hashIp,
  hashToken,
  safeEqual,
} from "@/lib/auth/tokens";
import { prisma } from "@/lib/db/prisma";
import {
  getClientIp,
  getUserAgentSummary,
} from "@/lib/security/request-meta";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/cookies";

export type SessionUser = {
  id: string;
  username: string;
  displayName: string | null;
  role: "ADMIN" | "DOCTOR";
};

export type ActiveSession = {
  sessionId: string;
  csrfToken: string;
  user: SessionUser;
  expiresAt: Date;
};

export async function createSession(userId: string): Promise<{
  rawToken: string;
  csrfToken: string;
  expiresAt: Date;
}> {
  const rawToken = generateOpaqueToken(32);
  const csrfToken = generateOpaqueToken(24);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const ip = await getClientIp();
  const ua = await getUserAgentSummary();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      csrfToken,
      expiresAt,
      ipHash: hashIp(ip),
      userAgentSummary: ua,
    },
  });

  return { rawToken, csrfToken, expiresAt };
}

export async function destroySessionByRawToken(
  rawToken: string | undefined,
): Promise<void> {
  if (!rawToken) return;
  await prisma.session.deleteMany({
    where: { tokenHash: hashToken(rawToken) },
  });
}

export async function getSessionFromCookies(): Promise<ActiveSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;

  const row = await prisma.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          isActive: true,
        },
      },
    },
  });

  if (!row) return null;
  if (!row.user.isActive) {
    await prisma.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }

  if (Date.now() - row.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await prisma.session
      .update({
        where: { id: row.id },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => undefined);
  }

  return {
    sessionId: row.id,
    csrfToken: row.csrfToken,
    expiresAt: row.expiresAt,
    user: {
      id: row.user.id,
      username: row.user.username,
      displayName: row.user.displayName,
      role: row.user.role,
    },
  };
}

export async function requireSession(): Promise<ActiveSession> {
  const session = await getSessionFromCookies();
  if (!session) {
    throw new AuthError("Unauthenticated", 401);
  }
  return session;
}

export async function verifyCsrf(
  session: ActiveSession,
  headerToken: string | null,
): Promise<boolean> {
  if (!headerToken) return false;
  return safeEqual(session.csrfToken, headerToken);
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}
