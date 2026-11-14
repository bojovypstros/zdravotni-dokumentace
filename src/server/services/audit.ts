import type { AuditAction, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type AuditWriteInput = {
  patientId?: string | null;
  actorId?: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  reason?: string | null;
  changeSummary?: string | null;
  before?: unknown;
  after?: unknown;
  requestId?: string | null;
};

function asJson(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

/** Create an AuditEvent row (call inside an existing transaction when possible). */
export async function createAuditEvent(
  tx: Prisma.TransactionClient | typeof prisma,
  input: AuditWriteInput,
) {
  return tx.auditEvent.create({
    data: {
      patientId: input.patientId ?? null,
      actorId: input.actorId ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      reason: input.reason ?? null,
      changeSummary: input.changeSummary ?? null,
      beforeJson: asJson(input.before),
      afterJson: asJson(input.after),
      requestId: input.requestId ?? null,
    },
  });
}

/**
 * Run a clinical mutation and write AuditEvent in the same DB transaction.
 * Gate: corrections / mutations = update in place + AuditEvent before/after.
 */
export async function runAuditedMutation<T>(opts: {
  patientId?: string | null;
  actorId?: string | null;
  entityType: string;
  action: AuditAction;
  reason?: string | null;
  changeSummary?: string | null;
  before?: unknown;
  requestId?: string | null;
  /** If set, overrides patientId on the audit row after mutate (e.g. Patient create). */
  resolvePatientId?: (result: T, entityId: string) => string | null | undefined;
  mutate: (
    tx: Prisma.TransactionClient,
  ) => Promise<{ result: T; entityId: string; after?: unknown }>;
}): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const { result, entityId, after } = await opts.mutate(tx);
    const patientId =
      opts.resolvePatientId?.(result, entityId) ?? opts.patientId ?? null;
    await createAuditEvent(tx, {
      patientId,
      actorId: opts.actorId,
      entityType: opts.entityType,
      entityId,
      action: opts.action,
      reason: opts.reason,
      changeSummary: opts.changeSummary,
      before: opts.before,
      after: after ?? undefined,
      requestId: opts.requestId,
    });
    return result;
  });
}
