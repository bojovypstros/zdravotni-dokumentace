import type { ObservationDefinition, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  ObservationDefinitionCreateInput,
  ObservationDefinitionUpdateInput,
} from "@/lib/validation/observation";
import { runAuditedMutation } from "@/server/services/audit";
import {
  SYSTEM_OBSERVATION_DEFINITIONS,
  systemDefinitionCreateData,
} from "@/server/services/observation-catalog";

export class ObservationDefinitionServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ObservationDefinitionServiceError";
    this.status = status;
  }
}

export function serializeDefinition(d: ObservationDefinition) {
  return {
    id: d.id,
    patientId: d.patientId,
    key: d.key,
    label: d.label,
    category: d.category,
    valueType: d.valueType,
    canonicalUnit: d.canonicalUnit,
    allowedUnits: (d.allowedUnits as string[] | null) ?? null,
    displayPrecision: d.displayPrecision,
    lowerReference: d.lowerReference != null ? Number(d.lowerReference) : null,
    upperReference: d.upperReference != null ? Number(d.upperReference) : null,
    supportsPair: d.supportsPair,
    isSystem: d.isSystem,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/** Ensure system catalog rows exist (idempotent). */
export async function ensureSystemObservationDefinitions(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  for (const def of SYSTEM_OBSERVATION_DEFINITIONS) {
    const existing = await tx.observationDefinition.findFirst({
      where: { key: def.key, patientId: null, isSystem: true },
    });
    if (existing) continue;
    await tx.observationDefinition.create({
      data: systemDefinitionCreateData(def),
    });
  }
}

/** Definitions available to a patient: system + their custom. */
export async function listDefinitionsForPatient(patientId: string) {
  await ensureSystemObservationDefinitions();
  const rows = await prisma.observationDefinition.findMany({
    where: {
      OR: [{ patientId: null, isSystem: true }, { patientId }],
      isActive: true,
    },
    orderBy: [{ isSystem: "desc" }, { label: "asc" }],
  });
  return rows.map(serializeDefinition);
}

export async function listAllDefinitionsForPatient(patientId: string) {
  await ensureSystemObservationDefinitions();
  const rows = await prisma.observationDefinition.findMany({
    where: {
      OR: [{ patientId: null, isSystem: true }, { patientId }],
    },
    orderBy: [{ isSystem: "desc" }, { label: "asc" }],
  });
  return rows.map(serializeDefinition);
}

export async function createCustomDefinition(opts: {
  input: ObservationDefinitionCreateInput;
  actorId: string;
  requestId?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const clash = await prisma.observationDefinition.findFirst({
    where: {
      key: opts.input.key,
      OR: [{ patientId: opts.input.patientId }, { patientId: null }],
    },
  });
  if (clash) {
    throw new ObservationDefinitionServiceError(
      "Definice s tímto klíčem už existuje.",
      409,
    );
  }

  const allowedUnits =
    opts.input.allowedUnits ?? [opts.input.canonicalUnit];

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "ObservationDefinition",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.observationDefinition.create({
        data: {
          patientId: opts.input.patientId,
          key: opts.input.key,
          label: opts.input.label,
          category: opts.input.category,
          valueType: opts.input.valueType,
          canonicalUnit: opts.input.canonicalUnit,
          allowedUnits,
          displayPrecision: opts.input.displayPrecision,
          supportsPair: opts.input.supportsPair,
          lowerReference:
            opts.input.lowerReference === undefined ||
            opts.input.lowerReference === null
              ? null
              : opts.input.lowerReference,
          upperReference:
            opts.input.upperReference === undefined ||
            opts.input.upperReference === null
              ? null
              : opts.input.upperReference,
          isSystem: false,
          isActive: true,
        },
      });
      return {
        result: serializeDefinition(created),
        entityId: created.id,
        after: serializeDefinition(created),
      };
    },
  });
}

export async function updateDefinition(opts: {
  id: string;
  patientId: string;
  input: ObservationDefinitionUpdateInput;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.observationDefinition.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;

  if (existing.isSystem) {
    // System catalog: only allow reference / precision tweaks via audit? Gate says custom defs.
    // Disallow mutating system keys/labels structurally — only isActive blocked; reject edits.
    throw new ObservationDefinitionServiceError(
      "Systémovou definici nelze upravit. Vytvořte vlastní veličinu.",
      403,
    );
  }
  if (existing.patientId !== opts.patientId) {
    throw new ObservationDefinitionServiceError("patientId nesouhlasí.", 400);
  }

  const before = serializeDefinition(existing);

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "ObservationDefinition",
    action: opts.reason ? "correction" : "update",
    reason: opts.reason,
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const data: Prisma.ObservationDefinitionUpdateInput = {};
      if (opts.input.label !== undefined) data.label = opts.input.label;
      if (opts.input.canonicalUnit !== undefined) {
        data.canonicalUnit = opts.input.canonicalUnit;
      }
      if (opts.input.allowedUnits !== undefined) {
        data.allowedUnits = opts.input.allowedUnits;
      }
      if (opts.input.displayPrecision !== undefined) {
        data.displayPrecision = opts.input.displayPrecision;
      }
      if (opts.input.supportsPair !== undefined) {
        data.supportsPair = opts.input.supportsPair;
      }
      if (opts.input.lowerReference !== undefined) {
        data.lowerReference =
          opts.input.lowerReference === null
            ? null
            : opts.input.lowerReference;
      }
      if (opts.input.upperReference !== undefined) {
        data.upperReference =
          opts.input.upperReference === null
            ? null
            : opts.input.upperReference;
      }
      if (opts.input.isActive !== undefined) data.isActive = opts.input.isActive;

      const updated = await tx.observationDefinition.update({
        where: { id: opts.id },
        data,
      });
      return {
        result: serializeDefinition(updated),
        entityId: updated.id,
        after: serializeDefinition(updated),
      };
    },
  });
}

export async function getDefinitionById(id: string) {
  const row = await prisma.observationDefinition.findUnique({ where: { id } });
  return row ? serializeDefinition(row) : null;
}
