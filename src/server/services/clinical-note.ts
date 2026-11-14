import type { ClinicalNote } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { ClinicalNoteWriteInput } from "@/lib/validation/clinical-note";
import { runAuditedMutation } from "@/server/services/audit";

export class ClinicalNoteServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ClinicalNoteServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export function serializeClinicalNote(n: ClinicalNote) {
  return {
    id: n.id,
    patientId: n.patientId,
    noteType: n.noteType,
    title: n.title,
    body: n.body,
    occurredAt: n.occurredAt.toISOString(),
    recordedAt: n.recordedAt.toISOString(),
    source: n.source,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
  };
}

export type SerializedClinicalNote = ReturnType<typeof serializeClinicalNote>;

const NOTE_TYPE_LABELS: Record<string, string> = {
  DIARY: "Deník",
  VISIT_SUMMARY: "Shrnutí návštěvy",
  MEDICATION_NOTE: "Poznámka k lékům",
  RESULT_NOTE: "Poznámka k výsledku",
  CARE_NOTE: "Péče",
  OTHER: "Jiné",
};

export function formatClinicalNoteSummary(n: SerializedClinicalNote): string {
  const typeLabel = NOTE_TYPE_LABELS[n.noteType] ?? n.noteType;
  const preview = n.body.length > 120 ? `${n.body.slice(0, 117)}…` : n.body;
  return `${typeLabel}: ${preview}`;
}

export function clinicalNoteTitle(n: SerializedClinicalNote): string {
  if (n.title?.trim()) return n.title.trim();
  return NOTE_TYPE_LABELS[n.noteType] ?? n.noteType;
}

export async function listClinicalNotes(opts: {
  patientId: string;
  noteType?: ClinicalNoteWriteInput["noteType"];
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const rows = await prisma.clinicalNote.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.noteType ? { noteType: opts.noteType } : {}),
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
  return rows.map(serializeClinicalNote);
}

export async function createClinicalNote(opts: {
  input: ClinicalNoteWriteInput;
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
    entityType: "ClinicalNote",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.clinicalNote.create({
        data: {
          patientId: opts.input.patientId,
          noteType: opts.input.noteType,
          title: emptyToNull(opts.input.title),
          body: opts.input.body.trim(),
          occurredAt,
          recordedAt: new Date(),
          source: opts.input.source,
        },
      });
      return {
        result: serializeClinicalNote(created),
        entityId: created.id,
        after: serializeClinicalNote(created),
      };
    },
  });
}

export async function updateClinicalNote(opts: {
  id: string;
  input: ClinicalNoteWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.clinicalNote.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new ClinicalNoteServiceError("patientId nesouhlasí.", 400);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);
  const before = serializeClinicalNote(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "ClinicalNote",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.clinicalNote.update({
        where: { id: opts.id },
        data: {
          noteType: opts.input.noteType,
          title: emptyToNull(opts.input.title),
          body: opts.input.body.trim(),
          occurredAt,
          source: opts.input.source,
        },
      });
      return {
        result: serializeClinicalNote(updated),
        entityId: updated.id,
        after: serializeClinicalNote(updated),
      };
    },
  });
}
