import type { User, UserRole } from "@prisma/client";

import { hashPassword } from "@/lib/auth/password";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { prisma } from "@/lib/db/prisma";
import { runAuditedMutation } from "@/server/services/audit";

export type StaffUserDto = {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  roleLabel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function serializeStaffUser(user: User): StaffUserDto {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role],
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function listStaffUsers() {
  const rows = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { username: "asc" }],
  });
  return rows.map(serializeStaffUser);
}

export async function createStaffUser(opts: {
  username: string;
  password: string;
  displayName?: string;
  role: UserRole;
  actorId: string;
  requestId?: string;
}) {
  const existing = await prisma.user.findUnique({
    where: { username: opts.username },
  });
  if (existing) {
    throw new StaffServiceError("Uživatelské jméno už existuje.", 409);
  }

  if (opts.role !== "ADMIN" && opts.role !== "DOCTOR") {
    throw new StaffServiceError("Nepodporovaná role.", 400);
  }

  const passwordHash = await hashPassword(opts.password);

  return runAuditedMutation({
    actorId: opts.actorId,
    entityType: "User",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.user.create({
        data: {
          username: opts.username,
          passwordHash,
          displayName: opts.displayName || opts.username,
          role: opts.role,
          isActive: true,
        },
      });
      const serialized = serializeStaffUser(created);
      return {
        result: serialized,
        entityId: created.id,
        after: {
          username: created.username,
          role: created.role,
          displayName: created.displayName,
        },
      };
    },
  });
}

export class StaffServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "StaffServiceError";
    this.status = status;
  }
}
