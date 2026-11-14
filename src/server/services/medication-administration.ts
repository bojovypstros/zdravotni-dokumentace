import type { MedicationAdministration } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { MedicationAdministrationWriteInput } from "@/lib/validation/medication";
import { runAuditedMutation } from "@/server/services/audit";

export class MedicationAdministrationServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "MedicationAdministrationServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function emptyToUndefinedId(
  value: string | undefined | null,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  return value;
}

export function serializeMedicationAdministration(a: MedicationAdministration) {
  return {
    id: a.id,
    patientId: a.patientId,
    medicationOrderId: a.medicationOrderId,
    medicationNameSnapshot: a.medicationNameSnapshot,
    doseValue: Number(a.doseValue),
    doseUnit: a.doseUnit,
    routeSnapshot: a.routeSnapshot,
    status: a.status,
    occurredAt: a.occurredAt.toISOString(),
    recordedAt: a.recordedAt.toISOString(),
    reason: a.reason,
    notes: a.notes,
    idempotencyKey: a.idempotencyKey,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export type SerializedMedicationAdministration = ReturnType<
  typeof serializeMedicationAdministration
>;

const ADMIN_STATUS_LABELS: Record<string, string> = {
  taken: "užito",
  partially_taken: "částečně",
  refused: "odmítnuto",
  omitted: "vynecháno",
  delayed: "odloženo",
  unknown: "neznámé",
};

export function formatAdministrationSummary(
  a: SerializedMedicationAdministration,
): string {
  const status = ADMIN_STATUS_LABELS[a.status] ?? a.status;
  return `${a.doseValue} ${a.doseUnit} · ${status}`;
}

export async function listMedicationAdministrations(opts: {
  patientId: string;
  medicationOrderId?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const rows = await prisma.medicationAdministration.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.medicationOrderId
        ? { medicationOrderId: opts.medicationOrderId }
        : {}),
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
  return rows.map(serializeMedicationAdministration);
}

export async function createMedicationAdministration(opts: {
  input: MedicationAdministrationWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}): Promise<{
  administration: SerializedMedicationAdministration;
  created: boolean;
} | null> {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  // Idempotency: retry with same key returns existing row (no duplicate).
  const existingByKey = await prisma.medicationAdministration.findUnique({
    where: { idempotencyKey: opts.input.idempotencyKey },
  });
  if (existingByKey) {
    if (existingByKey.patientId !== opts.input.patientId) {
      throw new MedicationAdministrationServiceError(
        "idempotencyKey již existuje pro jiného pacienta.",
        409,
      );
    }
    return {
      administration: serializeMedicationAdministration(existingByKey),
      created: false,
    };
  }

  const orderId = emptyToUndefinedId(opts.input.medicationOrderId ?? null);
  let order = null as Awaited<
    ReturnType<typeof prisma.medicationOrder.findUnique>
  >;
  if (orderId) {
    order = await prisma.medicationOrder.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new MedicationAdministrationServiceError(
        "Ordinace nenalezena.",
        404,
      );
    }
    if (order.patientId !== opts.input.patientId) {
      throw new MedicationAdministrationServiceError(
        "Ordinace patří jinému pacientovi.",
        400,
      );
    }
  }

  const medicationNameSnapshot =
    opts.input.medicationNameSnapshot?.trim() ||
    order?.medicationName ||
    null;
  if (!medicationNameSnapshot) {
    throw new MedicationAdministrationServiceError(
      "Chybí název léku (snapshot).",
      400,
    );
  }

  const doseValue =
    opts.input.doseValue ??
    (order ? Number(order.doseValue) : null);
  const doseUnit = opts.input.doseUnit ?? order?.doseUnit ?? null;
  const routeSnapshot = opts.input.routeSnapshot ?? order?.route ?? null;
  if (doseValue == null || !doseUnit || !routeSnapshot) {
    throw new MedicationAdministrationServiceError(
      "Chybí dávka, jednotka nebo cesta podání.",
      400,
    );
  }

  // Creating an order never auto-creates taken; omitted/refused stay as-is.
  const tz = opts.timeZone ?? patient.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);

  try {
    const administration = await runAuditedMutation({
      patientId: opts.input.patientId,
      actorId: opts.actorId,
      entityType: "MedicationAdministration",
      action: "create",
      reason: emptyToNull(opts.input.reason),
      requestId: opts.requestId,
      mutate: async (tx) => {
        const created = await tx.medicationAdministration.create({
          data: {
            patientId: opts.input.patientId,
            medicationOrderId: orderId ?? null,
            medicationNameSnapshot,
            doseValue: new PrismaNS.Decimal(doseValue),
            doseUnit,
            routeSnapshot,
            status: opts.input.status,
            occurredAt,
            recordedAt: new Date(),
            reason: emptyToNull(opts.input.reason),
            notes: emptyToNull(opts.input.notes),
            idempotencyKey: opts.input.idempotencyKey,
          },
        });
        return {
          result: serializeMedicationAdministration(created),
          entityId: created.id,
          after: serializeMedicationAdministration(created),
        };
      },
    });
    return { administration, created: true };
  } catch (err) {
    // Race: concurrent retry with same idempotency key.
    if (
      err instanceof PrismaNS.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const again = await prisma.medicationAdministration.findUnique({
        where: { idempotencyKey: opts.input.idempotencyKey },
      });
      if (again) {
        return {
          administration: serializeMedicationAdministration(again),
          created: false,
        };
      }
    }
    throw err;
  }
}

export async function updateMedicationAdministration(opts: {
  id: string;
  input: MedicationAdministrationWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.medicationAdministration.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new MedicationAdministrationServiceError("patientId nesouhlasí.", 400);
  }

  // Idempotency key is immutable after create.
  if (opts.input.idempotencyKey !== existing.idempotencyKey) {
    throw new MedicationAdministrationServiceError(
      "idempotencyKey nelze měnit.",
      400,
    );
  }

  const orderId = emptyToUndefinedId(opts.input.medicationOrderId ?? null);
  if (orderId) {
    const order = await prisma.medicationOrder.findUnique({
      where: { id: orderId },
    });
    if (!order || order.patientId !== opts.input.patientId) {
      throw new MedicationAdministrationServiceError(
        "Ordinace nepatří pacientovi.",
        400,
      );
    }
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);
  const before = serializeMedicationAdministration(existing);
  const isCorrection = Boolean(
    opts.input.correctionReason && opts.input.correctionReason.trim(),
  );

  const medicationNameSnapshot =
    opts.input.medicationNameSnapshot?.trim() ||
    existing.medicationNameSnapshot;
  const doseValue = opts.input.doseValue ?? Number(existing.doseValue);
  const doseUnit = opts.input.doseUnit ?? existing.doseUnit;
  const routeSnapshot = opts.input.routeSnapshot ?? existing.routeSnapshot;

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "MedicationAdministration",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.correctionReason || opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.medicationAdministration.update({
        where: { id: opts.id },
        data: {
          medicationOrderId: orderId === undefined ? undefined : orderId,
          medicationNameSnapshot,
          doseValue: new PrismaNS.Decimal(doseValue),
          doseUnit,
          routeSnapshot,
          status: opts.input.status,
          occurredAt,
          reason: emptyToNull(opts.input.reason),
          notes: emptyToNull(opts.input.notes),
        },
      });
      return {
        result: serializeMedicationAdministration(updated),
        entityId: updated.id,
        after: serializeMedicationAdministration(updated),
      };
    },
  });
}
