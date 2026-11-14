import type { FluidBalanceEntry, Prisma } from "@prisma/client";
import { formatInTimeZone } from "date-fns-tz";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { FluidBalanceWriteInput } from "@/lib/validation/fluid";
import { runAuditedMutation } from "@/server/services/audit";

export class FluidServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "FluidServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function decimalToNumber(value: Prisma.Decimal | number): number {
  return typeof value === "number" ? value : Number(value);
}

export function serializeFluidBalanceEntry(e: FluidBalanceEntry) {
  return {
    id: e.id,
    patientId: e.patientId,
    direction: e.direction,
    category: e.category,
    amountMl: decimalToNumber(e.amountMl),
    occurredAt: e.occurredAt.toISOString(),
    notes: e.notes,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export type SerializedFluidBalanceEntry = ReturnType<
  typeof serializeFluidBalanceEntry
>;

export function formatFluidSummary(e: SerializedFluidBalanceEntry): string {
  const dir = e.direction === "intake" ? "příjem" : "výdej";
  return `${dir}: ${e.amountMl} ml (${e.category})`;
}

export type FluidDaySummary = {
  dateKey: string;
  intakeMl: number;
  outputMl: number;
  netMl: number;
  entryCount: number;
};

export async function listFluidBalanceEntries(opts: {
  patientId: string;
  from?: Date;
  to?: Date;
  direction?: FluidBalanceWriteInput["direction"];
  limit?: number;
}) {
  const rows = await prisma.fluidBalanceEntry.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.direction ? { direction: opts.direction } : {}),
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
    take: opts.limit ?? 1000,
  });
  return rows.map(serializeFluidBalanceEntry);
}

/** Daily totals and net balance (PRD §6.8). No clinical advice. */
export function summarizeFluidByDay(
  entries: SerializedFluidBalanceEntry[],
  timeZone: string,
): FluidDaySummary[] {
  const map = new Map<string, FluidDaySummary>();
  for (const e of entries) {
    const dateKey = formatInTimeZone(
      new Date(e.occurredAt),
      timeZone,
      "yyyy-MM-dd",
    );
    let row = map.get(dateKey);
    if (!row) {
      row = {
        dateKey,
        intakeMl: 0,
        outputMl: 0,
        netMl: 0,
        entryCount: 0,
      };
      map.set(dateKey, row);
    }
    if (e.direction === "intake") row.intakeMl += e.amountMl;
    else row.outputMl += e.amountMl;
    row.entryCount += 1;
    row.netMl = row.intakeMl - row.outputMl;
  }
  return [...map.values()].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
}

export async function createFluidBalanceEntry(opts: {
  input: FluidBalanceWriteInput;
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
    entityType: "FluidBalanceEntry",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.fluidBalanceEntry.create({
        data: {
          patientId: opts.input.patientId,
          direction: opts.input.direction,
          category: opts.input.category.trim(),
          amountMl: opts.input.amountMl,
          occurredAt,
          notes: emptyToNull(opts.input.notes),
        },
      });
      const serialized = serializeFluidBalanceEntry(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function updateFluidBalanceEntry(opts: {
  id: string;
  input: FluidBalanceWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.fluidBalanceEntry.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new FluidServiceError("patientId nesouhlasí.", 400);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);
  const before = serializeFluidBalanceEntry(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "FluidBalanceEntry",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.fluidBalanceEntry.update({
        where: { id: opts.id },
        data: {
          direction: opts.input.direction,
          category: opts.input.category.trim(),
          amountMl: opts.input.amountMl,
          occurredAt,
          notes: emptyToNull(opts.input.notes),
        },
      });
      const serialized = serializeFluidBalanceEntry(updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}
