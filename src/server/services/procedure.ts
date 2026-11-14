import type { Procedure } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { ProcedureWriteInput } from "@/lib/validation/procedure";
import { runAuditedMutation } from "@/server/services/audit";

export class ProcedureServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ProcedureServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function serializeProcedure(p: Procedure) {
  return {
    id: p.id,
    patientId: p.patientId,
    display: p.display,
    status: p.status,
    occurredAt: p.occurredAt.toISOString(),
    performerLabel: p.performerLabel,
    outcome: p.outcome,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export type SerializedProcedure = ReturnType<typeof serializeProcedure>;

const STATUS_LABELS: Record<string, string> = {
  planned: "plánováno",
  completed: "provedeno",
  cancelled: "zrušeno",
  unknown: "neznámé",
};

export function formatProcedureSummary(p: SerializedProcedure): string {
  const status = STATUS_LABELS[p.status] ?? p.status;
  const performer = p.performerLabel ? ` — ${p.performerLabel}` : "";
  return `${status}${performer}`;
}

export async function listProcedures(opts: {
  patientId: string;
  from?: Date;
  to?: Date;
  status?: ProcedureWriteInput["status"];
  limit?: number;
}) {
  const rows = await prisma.procedure.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.from || opts.to
        ? {
            occurredAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { occurredAt: "desc" },
    take: opts.limit ?? 500,
  });
  return rows.map(serializeProcedure);
}

export async function createProcedure(opts: {
  input: ProcedureWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const tz = opts.timeZone ?? patient.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "Procedure",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.procedure.create({
        data: {
          patientId: opts.input.patientId,
          display: opts.input.display.trim(),
          status: opts.input.status,
          occurredAt,
          performerLabel: emptyToNull(opts.input.performerLabel),
          outcome: emptyToNull(opts.input.outcome),
          notes: emptyToNull(opts.input.notes),
        },
      });
      const serialized = serializeProcedure(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function updateProcedure(opts: {
  id: string;
  input: ProcedureWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.procedure.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new ProcedureServiceError("patientId nesouhlasí.", 400);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);
  const before = serializeProcedure(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Procedure",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.procedure.update({
        where: { id: opts.id },
        data: {
          display: opts.input.display.trim(),
          status: opts.input.status,
          occurredAt,
          performerLabel: emptyToNull(opts.input.performerLabel),
          outcome: emptyToNull(opts.input.outcome),
          notes: emptyToNull(opts.input.notes),
        },
      });
      const serialized = serializeProcedure(updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}
