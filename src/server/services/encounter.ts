import type { Encounter } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { EncounterWriteInput } from "@/lib/validation/encounter";
import { runAuditedMutation } from "@/server/services/audit";

export class EncounterServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "EncounterServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function serializeEncounter(e: Encounter) {
  return {
    id: e.id,
    patientId: e.patientId,
    type: e.type,
    title: e.title,
    startAt: e.startAt.toISOString(),
    endAt: e.endAt?.toISOString() ?? null,
    status: e.status,
    facilityLabel: e.facilityLabel,
    reason: e.reason,
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export type SerializedEncounter = ReturnType<typeof serializeEncounter>;

const TYPE_LABELS: Record<string, string> = {
  hospitalization: "Hospitalizace",
  outpatient: "Ambulantní",
  emergency: "Urgentní",
  self_monitoring: "Vlastní sledování",
  other: "Jiné",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "plánováno",
  in_progress: "probíhá",
  completed: "ukončeno",
  cancelled: "zrušeno",
};

export function formatEncounterSummary(e: SerializedEncounter): string {
  const type = TYPE_LABELS[e.type] ?? e.type;
  const status = STATUS_LABELS[e.status] ?? e.status;
  const facility = e.facilityLabel ? ` — ${e.facilityLabel}` : "";
  return `${type} (${status})${facility}`;
}

export async function listEncounters(opts: {
  patientId: string;
  from?: Date;
  to?: Date;
  status?: EncounterWriteInput["status"];
  limit?: number;
}) {
  const rows = await prisma.encounter.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.status ? { status: opts.status } : {}),
      ...(opts.from || opts.to
        ? {
            startAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startAt: "desc" },
    take: opts.limit ?? 500,
  });
  return rows.map(serializeEncounter);
}

export async function createEncounter(opts: {
  input: EncounterWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const tz = opts.timeZone ?? patient.timezone ?? DEFAULT_TIMEZONE;
  const startAt = parseWallClockInTz(opts.input.startAtLocal, tz);
  const endAt = opts.input.endAtLocal
    ? parseWallClockInTz(opts.input.endAtLocal, tz)
    : null;

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "Encounter",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.encounter.create({
        data: {
          patientId: opts.input.patientId,
          type: opts.input.type,
          title: opts.input.title.trim(),
          startAt,
          endAt,
          status: opts.input.status,
          facilityLabel: emptyToNull(opts.input.facilityLabel),
          reason: emptyToNull(opts.input.reason),
          notes: emptyToNull(opts.input.notes),
        },
      });
      const serialized = serializeEncounter(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function updateEncounter(opts: {
  id: string;
  input: EncounterWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.encounter.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new EncounterServiceError("patientId nesouhlasí.", 400);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const startAt = parseWallClockInTz(opts.input.startAtLocal, tz);
  const endAt = opts.input.endAtLocal
    ? parseWallClockInTz(opts.input.endAtLocal, tz)
    : null;
  const before = serializeEncounter(existing);
  const isCorrection = Boolean(
    opts.input.correctionReason && opts.input.correctionReason.trim(),
  );

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Encounter",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.correctionReason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.encounter.update({
        where: { id: opts.id },
        data: {
          type: opts.input.type,
          title: opts.input.title.trim(),
          startAt,
          endAt,
          status: opts.input.status,
          facilityLabel: emptyToNull(opts.input.facilityLabel),
          reason: emptyToNull(opts.input.reason),
          notes: emptyToNull(opts.input.notes),
        },
      });
      const serialized = serializeEncounter(updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}
