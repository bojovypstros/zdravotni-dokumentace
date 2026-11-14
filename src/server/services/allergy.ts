import type { Allergy, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { AllergyWriteInput } from "@/lib/validation/allergy";
import { runAuditedMutation } from "@/server/services/audit";

export class AllergyServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "AllergyServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function dateOrNull(value: string | undefined | null): Date | null {
  const s = emptyToNull(value ?? null);
  return s ? new Date(`${s}T00:00:00.000Z`) : null;
}

export function serializeAllergy(a: Allergy) {
  return {
    id: a.id,
    patientId: a.patientId,
    substance: a.substance,
    reaction: a.reaction,
    severity: a.severity,
    status: a.status,
    verification: a.verification,
    onsetDate: a.onsetDate ? a.onsetDate.toISOString().slice(0, 10) : null,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

function toData(input: AllergyWriteInput): Prisma.AllergyUncheckedCreateInput {
  return {
    patientId: input.patientId,
    substance: input.substance,
    reaction: emptyToNull(input.reaction),
    severity: input.severity,
    status: input.status,
    verification: input.verification,
    onsetDate: dateOrNull(input.onsetDate),
    notes: emptyToNull(input.notes),
  };
}

/**
 * Integrity rule (DATA_MODEL §4.7 + research lock):
 * unknown allergy record ≠ “no known allergies”.
 * Creating/activating an allergy clears noKnownAllergies.
 * Setting noKnownAllergies is blocked while active allergies exist (patient service).
 */
export async function listAllergies(patientId: string) {
  const rows = await prisma.allergy.findMany({
    where: { patientId },
    orderBy: [{ status: "asc" }, { substance: "asc" }],
  });
  return rows.map(serializeAllergy);
}

export async function createAllergy(opts: {
  input: AllergyWriteInput;
  actorId: string;
  requestId?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  // verification=unknown is a real allergy record with unknown confirmation —
  // never treat as NKA.
  if (
    patient.noKnownAllergies &&
    (opts.input.status === "active" || opts.input.status === "unconfirmed")
  ) {
    // Clear NKA in same transaction when adding a concrete allergy.
  }

  const data = toData(opts.input);

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "Allergy",
    action: "create",
    requestId: opts.requestId,
    changeSummary:
      opts.input.verification === "unknown"
        ? "Allergy with unknown verification (not NKA)"
        : undefined,
    mutate: async (tx) => {
      if (
        patient.noKnownAllergies &&
        (data.status === "active" || data.status === "unconfirmed")
      ) {
        await tx.patient.update({
          where: { id: patient.id },
          data: { noKnownAllergies: false },
        });
      }
      const created = await tx.allergy.create({ data });
      return {
        result: serializeAllergy(created),
        entityId: created.id,
        after: serializeAllergy(created),
      };
    },
  });
}

export async function updateAllergy(opts: {
  id: string;
  input: AllergyWriteInput;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.allergy.findUnique({ where: { id: opts.id } });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new AllergyServiceError("patientId nesouhlasí.", 400);
  }

  const before = serializeAllergy(existing);
  const data = toData(opts.input);

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Allergy",
    action: "update",
    reason: opts.reason,
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      if (data.status === "active" || data.status === "unconfirmed") {
        await tx.patient.update({
          where: { id: existing.patientId },
          data: { noKnownAllergies: false },
        });
      }
      const updated = await tx.allergy.update({
        where: { id: opts.id },
        data: {
          substance: data.substance,
          reaction: data.reaction,
          severity: data.severity,
          status: data.status,
          verification: data.verification,
          onsetDate: data.onsetDate,
          notes: data.notes,
        },
      });
      return {
        result: serializeAllergy(updated),
        entityId: updated.id,
        after: serializeAllergy(updated),
      };
    },
  });
}

export async function archiveAllergy(opts: {
  id: string;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.allergy.findUnique({ where: { id: opts.id } });
  if (!existing) return null;
  const before = serializeAllergy(existing);

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Allergy",
    action: "archive",
    reason: opts.reason,
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const updated = await tx.allergy.update({
        where: { id: opts.id },
        data: { status: "inactive" },
      });
      return {
        result: serializeAllergy(updated),
        entityId: updated.id,
        after: serializeAllergy(updated),
      };
    },
  });
}
