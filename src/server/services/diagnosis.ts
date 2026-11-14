import type { Diagnosis, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { DiagnosisWriteInput } from "@/lib/validation/diagnosis";
import { runAuditedMutation } from "@/server/services/audit";

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function dateOrNull(value: string | undefined | null): Date | null {
  const s = emptyToNull(value ?? null);
  return s ? new Date(`${s}T00:00:00.000Z`) : null;
}

export function serializeDiagnosis(d: Diagnosis) {
  return {
    id: d.id,
    patientId: d.patientId,
    display: d.display,
    codeSystem: d.codeSystem,
    code: d.code,
    status: d.status,
    onsetDate: d.onsetDate ? d.onsetDate.toISOString().slice(0, 10) : null,
    resolvedDate: d.resolvedDate
      ? d.resolvedDate.toISOString().slice(0, 10)
      : null,
    source: d.source,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

function toData(input: DiagnosisWriteInput): Prisma.DiagnosisUncheckedCreateInput {
  return {
    patientId: input.patientId,
    display: input.display,
    codeSystem: emptyToNull(input.codeSystem),
    code: emptyToNull(input.code),
    status: input.status,
    onsetDate: dateOrNull(input.onsetDate),
    resolvedDate: dateOrNull(input.resolvedDate),
    source: emptyToNull(input.source),
    notes: emptyToNull(input.notes),
  };
}

export async function listDiagnoses(patientId: string) {
  const rows = await prisma.diagnosis.findMany({
    where: { patientId },
    orderBy: [{ status: "asc" }, { display: "asc" }],
  });
  return rows.map(serializeDiagnosis);
}

export async function createDiagnosis(opts: {
  input: DiagnosisWriteInput;
  actorId: string;
  requestId?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const data = toData(opts.input);
  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "Diagnosis",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.diagnosis.create({ data });
      return {
        result: serializeDiagnosis(created),
        entityId: created.id,
        after: serializeDiagnosis(created),
      };
    },
  });
}

export async function updateDiagnosis(opts: {
  id: string;
  input: DiagnosisWriteInput;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.diagnosis.findUnique({ where: { id: opts.id } });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new Error("patientId mismatch");
  }

  const before = serializeDiagnosis(existing);
  const data = toData(opts.input);

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Diagnosis",
    action: "update",
    reason: opts.reason,
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const updated = await tx.diagnosis.update({
        where: { id: opts.id },
        data: {
          display: data.display,
          codeSystem: data.codeSystem,
          code: data.code,
          status: data.status,
          onsetDate: data.onsetDate,
          resolvedDate: data.resolvedDate,
          source: data.source,
          notes: data.notes,
        },
      });
      return {
        result: serializeDiagnosis(updated),
        entityId: updated.id,
        after: serializeDiagnosis(updated),
      };
    },
  });
}

export async function archiveDiagnosis(opts: {
  id: string;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.diagnosis.findUnique({ where: { id: opts.id } });
  if (!existing) return null;
  const before = serializeDiagnosis(existing);

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Diagnosis",
    action: "archive",
    reason: opts.reason,
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const updated = await tx.diagnosis.update({
        where: { id: opts.id },
        data: { status: "historical" },
      });
      return {
        result: serializeDiagnosis(updated),
        entityId: updated.id,
        after: serializeDiagnosis(updated),
      };
    },
  });
}
