import type { SymptomEntry } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { SymptomEntryWriteInput } from "@/lib/validation/symptom";
import { runAuditedMutation } from "@/server/services/audit";

export class SymptomServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SymptomServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function decimalToNumber(
  value: PrismaNS.Decimal | null | undefined,
): number | null {
  if (value == null) return null;
  return Number(value);
}

export function serializeSymptomEntry(s: SymptomEntry) {
  return {
    id: s.id,
    patientId: s.patientId,
    symptom: s.symptom,
    intensity: decimalToNumber(s.intensity),
    intensityScale: s.intensityScale,
    location: s.location,
    character: s.character,
    onsetAt: s.onsetAt?.toISOString() ?? null,
    endedAt: s.endedAt?.toISOString() ?? null,
    occurredAt: s.occurredAt.toISOString(),
    recordedAt: s.recordedAt.toISOString(),
    context: s.context,
    notes: s.notes,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export type SerializedSymptomEntry = ReturnType<typeof serializeSymptomEntry>;

export function formatSymptomSummary(s: SerializedSymptomEntry): string {
  const parts: string[] = [];
  if (s.intensity != null) {
    const scale = s.intensityScale?.trim() || "0-10";
    parts.push(`intenzita ${s.intensity} (${scale})`);
  }
  if (s.location) parts.push(s.location);
  if (s.character) parts.push(s.character);
  if (s.context) parts.push(s.context);
  return parts.length > 0 ? parts.join(" · ") : "symptom";
}

function parseOptionalWallClock(
  value: string | undefined,
  tz: string,
): Date | null {
  if (!value || value === "") return null;
  return parseWallClockInTz(value, tz);
}

export async function listSymptomEntries(opts: {
  patientId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const rows = await prisma.symptomEntry.findMany({
    where: {
      patientId: opts.patientId,
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
  return rows.map(serializeSymptomEntry);
}

export async function createSymptomEntry(opts: {
  input: SymptomEntryWriteInput;
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
  const onsetAt = parseOptionalWallClock(opts.input.onsetAtLocal, tz);
  const endedAt = parseOptionalWallClock(opts.input.endedAtLocal, tz);

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "SymptomEntry",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.symptomEntry.create({
        data: {
          patientId: opts.input.patientId,
          symptom: opts.input.symptom.trim(),
          intensity:
            opts.input.intensity == null
              ? null
              : new PrismaNS.Decimal(opts.input.intensity),
          intensityScale:
            emptyToNull(opts.input.intensityScale) ??
            (opts.input.intensity != null ? "0-10" : null),
          location: emptyToNull(opts.input.location),
          character: emptyToNull(opts.input.character),
          onsetAt,
          endedAt,
          occurredAt,
          recordedAt: new Date(),
          context: emptyToNull(opts.input.context),
          notes: emptyToNull(opts.input.notes),
        },
      });
      return {
        result: serializeSymptomEntry(created),
        entityId: created.id,
        after: serializeSymptomEntry(created),
      };
    },
  });
}

export async function updateSymptomEntry(opts: {
  id: string;
  input: SymptomEntryWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.symptomEntry.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new SymptomServiceError("patientId nesouhlasí.", 400);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);
  const onsetAt = parseOptionalWallClock(opts.input.onsetAtLocal, tz);
  const endedAt = parseOptionalWallClock(opts.input.endedAtLocal, tz);
  const before = serializeSymptomEntry(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "SymptomEntry",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.symptomEntry.update({
        where: { id: opts.id },
        data: {
          symptom: opts.input.symptom.trim(),
          intensity:
            opts.input.intensity == null
              ? null
              : new PrismaNS.Decimal(opts.input.intensity),
          intensityScale:
            emptyToNull(opts.input.intensityScale) ??
            (opts.input.intensity != null ? "0-10" : null),
          location: emptyToNull(opts.input.location),
          character: emptyToNull(opts.input.character),
          onsetAt,
          endedAt,
          occurredAt,
          context: emptyToNull(opts.input.context),
          notes: emptyToNull(opts.input.notes),
        },
      });
      return {
        result: serializeSymptomEntry(updated),
        entityId: updated.id,
        after: serializeSymptomEntry(updated),
      };
    },
  });
}
