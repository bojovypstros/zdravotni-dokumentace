import type { Observation, ObservationDefinition, Prisma } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import { formatObservationValue } from "@/lib/observation/format";
import type { ObservationWriteInput } from "@/lib/validation/observation";
import { runAuditedMutation } from "@/server/services/audit";
import { ensureSystemObservationDefinitions } from "@/server/services/observation-definition";

export { formatObservationValue };

export class ObservationServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ObservationServiceError";
    this.status = status;
  }
}

type ObservationWithDef = Observation & { definition: ObservationDefinition };

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function decimalToNumber(
  value: Prisma.Decimal | null | undefined,
): number | null {
  if (value == null) return null;
  return Number(value);
}

export function serializeObservation(o: ObservationWithDef) {
  return {
    id: o.id,
    patientId: o.patientId,
    definitionId: o.definitionId,
    definitionKey: o.definition.key,
    definitionLabel: o.definition.label,
    supportsPair: o.definition.supportsPair,
    displayPrecision: o.definition.displayPrecision,
    category: o.definition.category,
    valueType: o.definition.valueType,
    numericValue: decimalToNumber(o.numericValue),
    secondaryNumericValue: decimalToNumber(o.secondaryNumericValue),
    textValue: o.textValue,
    unit: o.unit,
    occurredAt: o.occurredAt.toISOString(),
    recordedAt: o.recordedAt.toISOString(),
    method: o.method,
    bodySite: o.bodySite,
    context: o.context,
    source: o.source,
    notes: o.notes,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

function validateAgainstDefinition(
  def: ObservationDefinition,
  input: ObservationWriteInput,
) {
  const allowed = (def.allowedUnits as string[] | null) ?? null;
  if (allowed && allowed.length > 0 && !allowed.includes(input.unit)) {
    throw new ObservationServiceError(
      `Jednotka „${input.unit}“ není povolená pro ${def.label}.`,
      400,
    );
  }

  if (def.supportsPair) {
    if (input.numericValue == null || input.secondaryNumericValue == null) {
      throw new ObservationServiceError(
        "Krevní tlak vyžaduje systolický a diastolický tlak.",
        400,
      );
    }
  }

  if (def.valueType === "boolean" || def.valueType === "text") {
    if (!input.textValue && input.numericValue == null) {
      throw new ObservationServiceError("Chybí hodnota.", 400);
    }
  } else if (input.numericValue == null && !def.supportsPair) {
    throw new ObservationServiceError("Chybí číselná hodnota.", 400);
  }
}

async function resolveDefinitionForPatient(
  definitionId: string,
  patientId: string,
) {
  await ensureSystemObservationDefinitions();
  const def = await prisma.observationDefinition.findUnique({
    where: { id: definitionId },
  });
  if (!def || !def.isActive) return null;
  if (def.patientId && def.patientId !== patientId) return null;
  if (!def.isSystem && def.patientId !== patientId) return null;
  return def;
}

export async function listObservations(opts: {
  patientId: string;
  definitionId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const rows = await prisma.observation.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.definitionId ? { definitionId: opts.definitionId } : {}),
      ...(opts.from || opts.to
        ? {
            occurredAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    include: { definition: true },
    orderBy: { occurredAt: "desc" },
    take: opts.limit ?? 500,
  });
  return rows.map(serializeObservation);
}

export async function createObservation(opts: {
  input: ObservationWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const def = await resolveDefinitionForPatient(
    opts.input.definitionId,
    opts.input.patientId,
  );
  if (!def) {
    throw new ObservationServiceError("Definice měření nenalezena.", 404);
  }
  validateAgainstDefinition(def, opts.input);

  const tz = opts.timeZone ?? patient.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "Observation",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.observation.create({
        data: {
          patientId: opts.input.patientId,
          definitionId: opts.input.definitionId,
          numericValue:
            opts.input.numericValue == null
              ? null
              : new PrismaNS.Decimal(opts.input.numericValue),
          secondaryNumericValue:
            opts.input.secondaryNumericValue == null
              ? null
              : new PrismaNS.Decimal(opts.input.secondaryNumericValue),
          textValue: emptyToNull(opts.input.textValue ?? null),
          unit: opts.input.unit,
          occurredAt,
          recordedAt: new Date(),
          method: emptyToNull(opts.input.method),
          bodySite: emptyToNull(opts.input.bodySite),
          context: emptyToNull(opts.input.context),
          source: opts.input.source,
          notes: emptyToNull(opts.input.notes),
        },
        include: { definition: true },
      });
      return {
        result: serializeObservation(created),
        entityId: created.id,
        after: serializeObservation(created),
      };
    },
  });
}

export async function updateObservation(opts: {
  id: string;
  input: ObservationWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.observation.findUnique({
    where: { id: opts.id },
    include: { definition: true },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new ObservationServiceError("patientId nesouhlasí.", 400);
  }

  const def =
    opts.input.definitionId === existing.definitionId
      ? existing.definition
      : await resolveDefinitionForPatient(
          opts.input.definitionId,
          opts.input.patientId,
        );
  if (!def) {
    throw new ObservationServiceError("Definice měření nenalezena.", 404);
  }
  validateAgainstDefinition(def, opts.input);

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz =
    opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);
  const before = serializeObservation(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "Observation",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.observation.update({
        where: { id: opts.id },
        data: {
          definitionId: opts.input.definitionId,
          numericValue:
            opts.input.numericValue == null
              ? null
              : new PrismaNS.Decimal(opts.input.numericValue),
          secondaryNumericValue:
            opts.input.secondaryNumericValue == null
              ? null
              : new PrismaNS.Decimal(opts.input.secondaryNumericValue),
          textValue: emptyToNull(opts.input.textValue ?? null),
          unit: opts.input.unit,
          occurredAt,
          method: emptyToNull(opts.input.method),
          bodySite: emptyToNull(opts.input.bodySite),
          context: emptyToNull(opts.input.context),
          source: opts.input.source,
          notes: emptyToNull(opts.input.notes),
        },
        include: { definition: true },
      });
      return {
        result: serializeObservation(updated),
        entityId: updated.id,
        after: serializeObservation(updated),
      };
    },
  });
}
