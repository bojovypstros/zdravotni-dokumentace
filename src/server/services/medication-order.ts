import type { MedicationOrder, Prisma } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { MedicationOrderWriteInput } from "@/lib/validation/medication";
import { runAuditedMutation } from "@/server/services/audit";

export class MedicationOrderServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "MedicationOrderServiceError";
    this.status = status;
  }
}

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

export function serializeMedicationOrder(o: MedicationOrder) {
  return {
    id: o.id,
    patientId: o.patientId,
    medicationName: o.medicationName,
    activeIngredient: o.activeIngredient,
    strengthValue: decimalToNumber(o.strengthValue),
    strengthUnit: o.strengthUnit,
    form: o.form,
    doseValue: Number(o.doseValue),
    doseUnit: o.doseUnit,
    route: o.route,
    regimen: o.regimen,
    frequencyText: o.frequencyText,
    scheduledTimes: (o.scheduledTimes as string[] | null) ?? null,
    instructions: o.instructions,
    indication: o.indication,
    startAt: o.startAt.toISOString(),
    endAt: o.endAt ? o.endAt.toISOString() : null,
    status: o.status,
    sourceType: o.sourceType,
    sourceLabel: o.sourceLabel,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

export type SerializedMedicationOrder = ReturnType<
  typeof serializeMedicationOrder
>;

async function resolvePatientTz(patientId: string, override?: string) {
  if (override) return override;
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  return patient?.timezone ?? DEFAULT_TIMEZONE;
}

function buildOrderData(
  input: MedicationOrderWriteInput,
  startAt: Date,
  endAt: Date | null,
): Omit<Prisma.MedicationOrderUncheckedCreateInput, "id"> {
  return {
    patientId: input.patientId,
    medicationName: input.medicationName,
    activeIngredient: emptyToNull(input.activeIngredient),
    strengthValue:
      input.strengthValue == null
        ? null
        : new PrismaNS.Decimal(input.strengthValue),
    strengthUnit: emptyToNull(input.strengthUnit),
    form: emptyToNull(input.form),
    doseValue: new PrismaNS.Decimal(input.doseValue),
    doseUnit: input.doseUnit,
    route: input.route,
    regimen: input.regimen,
    frequencyText: emptyToNull(input.frequencyText),
    scheduledTimes:
      input.scheduledTimes === undefined
        ? undefined
        : input.scheduledTimes === null || input.scheduledTimes.length === 0
          ? PrismaNS.JsonNull
          : input.scheduledTimes,
    instructions: emptyToNull(input.instructions),
    indication: emptyToNull(input.indication),
    startAt,
    endAt,
    status: input.status,
    sourceType: input.sourceType,
    sourceLabel: emptyToNull(input.sourceLabel),
  };
}

export async function listMedicationOrders(opts: {
  patientId: string;
  status?: string;
}) {
  const rows = await prisma.medicationOrder.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.status
        ? { status: opts.status as MedicationOrder["status"] }
        : {}),
    },
    orderBy: [{ status: "asc" }, { medicationName: "asc" }],
  });
  return rows.map(serializeMedicationOrder);
}

export async function getMedicationOrder(id: string) {
  const row = await prisma.medicationOrder.findUnique({ where: { id } });
  return row ? serializeMedicationOrder(row) : null;
}

export async function createMedicationOrder(opts: {
  input: MedicationOrderWriteInput;
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
  const endAt =
    opts.input.endAtLocal && opts.input.endAtLocal !== ""
      ? parseWallClockInTz(opts.input.endAtLocal, tz)
      : null;

  const data = buildOrderData(opts.input, startAt, endAt);

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "MedicationOrder",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.medicationOrder.create({ data });
      return {
        result: serializeMedicationOrder(created),
        entityId: created.id,
        after: serializeMedicationOrder(created),
      };
    },
  });
}

export async function updateMedicationOrder(opts: {
  id: string;
  input: MedicationOrderWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.medicationOrder.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new MedicationOrderServiceError("patientId nesouhlasí.", 400);
  }

  const tz = await resolvePatientTz(existing.patientId, opts.timeZone);
  const startAt = parseWallClockInTz(opts.input.startAtLocal, tz);
  const endAt =
    opts.input.endAtLocal && opts.input.endAtLocal !== ""
      ? parseWallClockInTz(opts.input.endAtLocal, tz)
      : null;

  const before = serializeMedicationOrder(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());
  const data = buildOrderData(opts.input, startAt, endAt);

  // Status/name changes must not rewrite historical administrations (snapshots).
  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "MedicationOrder",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.medicationOrder.update({
        where: { id: opts.id },
        data,
      });
      return {
        result: serializeMedicationOrder(updated),
        entityId: updated.id,
        after: serializeMedicationOrder(updated),
      };
    },
  });
}
