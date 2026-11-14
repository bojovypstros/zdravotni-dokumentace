import { connection } from "next/server";

import {
  isNextResponse,
  jsonError,
  jsonOk,
  requireApiSession,
  requireMutatingSession,
} from "@/lib/api/http";
import { canManageStaff } from "@/lib/auth/roles";
import { AuthError } from "@/lib/auth/session";
import { getRequestId } from "@/lib/security/request-meta";
import { createStaffSchema } from "@/lib/validation/staff";
import {
  createStaffUser,
  listStaffUsers,
  StaffServiceError,
} from "@/server/services/staff";

export async function GET() {
  await connection();
  let session;
  try {
    session = await requireApiSession();
  } catch (err) {
    if (err instanceof AuthError) return jsonError("Neautorizováno.", 401);
    throw err;
  }

  if (!canManageStaff(session.user.role)) {
    return jsonError("Pouze vrchní lékař může spravovat personál.", 403);
  }

  const users = await listStaffUsers();
  return jsonOk({ users });
}

export async function POST(request: Request) {
  await connection();
  const sessionOrError = await requireMutatingSession(request);
  if (isNextResponse(sessionOrError)) return sessionOrError;

  if (!canManageStaff(sessionOrError.user.role)) {
    return jsonError("Pouze vrchní lékař může zakládat účty personálu.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Neplatné JSON tělo.", 400);
  }

  const parsed = createStaffSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Neplatný vstup.", 400, {
      issues: parsed.error.flatten(),
    });
  }

  try {
    const requestId = await getRequestId();
    const user = await createStaffUser({
      username: parsed.data.username,
      password: parsed.data.password,
      displayName: parsed.data.displayName || undefined,
      role: parsed.data.role,
      actorId: sessionOrError.user.id,
      requestId,
    });
    return jsonOk({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof StaffServiceError) {
      return jsonError(err.message, err.status);
    }
    throw err;
  }
}
