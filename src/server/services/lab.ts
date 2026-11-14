import type { LabPanel, LabResult, Prisma } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type {
  LabPanelWriteInput,
  LabResultInput,
} from "@/lib/validation/lab";
import { runAuditedMutation } from "@/server/services/audit";

export class LabServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "LabServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : Number(value);
}

/** Derive flag from numeric value + reference range when flag not provided. */
export function deriveLabFlag(opts: {
  valueNumeric: number | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  explicitFlag?: LabResultInput["flag"];
}): LabResultInput["flag"] {
  if (opts.explicitFlag) return opts.explicitFlag;
  if (opts.valueNumeric == null) return "unknown";
  const { referenceLow: low, referenceHigh: high, valueNumeric: v } = opts;
  if (low == null && high == null) return "unknown";
  if (low != null && v < low) return "low";
  if (high != null && v > high) return "high";
  if (low != null || high != null) return "normal";
  return "unknown";
}

export function serializeLabResult(r: LabResult) {
  return {
    id: r.id,
    panelId: r.panelId,
    analyte: r.analyte,
    valueNumeric: decimalToNumber(r.valueNumeric),
    valueText: r.valueText,
    unit: r.unit,
    referenceLow: decimalToNumber(r.referenceLow),
    referenceHigh: decimalToNumber(r.referenceHigh),
    referenceText: r.referenceText,
    flag: r.flag,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function serializeLabPanel(
  panel: LabPanel & { results?: LabResult[] },
) {
  return {
    id: panel.id,
    patientId: panel.patientId,
    title: panel.title,
    collectedAt: panel.collectedAt?.toISOString() ?? null,
    resultedAt: panel.resultedAt?.toISOString() ?? null,
    laboratory: panel.laboratory,
    source: panel.source,
    notes: panel.notes,
    createdAt: panel.createdAt.toISOString(),
    updatedAt: panel.updatedAt.toISOString(),
    results: (panel.results ?? []).map(serializeLabResult),
  };
}

export type SerializedLabPanel = ReturnType<typeof serializeLabPanel>;

export function formatLabPanelSummary(p: SerializedLabPanel): string {
  const parts = p.results.slice(0, 4).map((r) => {
    const val =
      r.valueNumeric != null
        ? `${r.valueNumeric}${r.unit ? ` ${r.unit}` : ""}`
        : (r.valueText ?? "");
    const flag =
      r.flag && r.flag !== "normal" && r.flag !== "unknown"
        ? ` [${r.flag}]`
        : "";
    return `${r.analyte} ${val}${flag}`.trim();
  });
  const more =
    p.results.length > 4 ? ` (+${p.results.length - 4})` : "";
  return parts.join("; ") + more;
}

function resultCreateData(input: LabResultInput) {
  const valueNumeric = input.valueNumeric;
  const referenceLow = input.referenceLow;
  const referenceHigh = input.referenceHigh;
  const flag = deriveLabFlag({
    valueNumeric,
    referenceLow,
    referenceHigh,
    explicitFlag: input.flag,
  });
  return {
    analyte: input.analyte.trim(),
    valueNumeric,
    valueText: emptyToNull(input.valueText),
    unit: emptyToNull(input.unit),
    referenceLow,
    referenceHigh,
    referenceText: emptyToNull(input.referenceText),
    flag,
    notes: emptyToNull(input.notes),
  };
}

export async function listLabPanels(opts: {
  patientId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const rows = await prisma.labPanel.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.from || opts.to
        ? {
            OR: [
              {
                collectedAt: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lte: opts.to } : {}),
                },
              },
              {
                collectedAt: null,
                resultedAt: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lte: opts.to } : {}),
                },
              },
            ],
          }
        : {}),
    },
    include: { results: { orderBy: { createdAt: "asc" } } },
    orderBy: [{ collectedAt: "desc" }, { resultedAt: "desc" }, { createdAt: "desc" }],
    take: opts.limit ?? 500,
  });
  return rows.map(serializeLabPanel);
}

export async function createLabPanel(opts: {
  input: LabPanelWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const tz = opts.timeZone ?? patient.timezone ?? DEFAULT_TIMEZONE;
  const collectedAt = opts.input.collectedAtLocal
    ? parseWallClockInTz(opts.input.collectedAtLocal, tz)
    : null;
  const resultedAt = opts.input.resultedAtLocal
    ? parseWallClockInTz(opts.input.resultedAtLocal, tz)
    : null;
  if (!collectedAt && !resultedAt) {
    throw new LabServiceError(
      "Vyžaduje se čas odběru nebo čas výsledku.",
      400,
    );
  }

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "LabPanel",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.labPanel.create({
        data: {
          patientId: opts.input.patientId,
          title: opts.input.title.trim(),
          collectedAt,
          resultedAt,
          laboratory: emptyToNull(opts.input.laboratory),
          source: emptyToNull(opts.input.source),
          notes: emptyToNull(opts.input.notes),
          results: {
            create: opts.input.results.map(resultCreateData),
          },
        },
        include: { results: { orderBy: { createdAt: "asc" } } },
      });
      const serialized = serializeLabPanel(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function updateLabPanel(opts: {
  id: string;
  input: LabPanelWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.labPanel.findUnique({
    where: { id: opts.id },
    include: { results: true },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new LabServiceError("patientId nesouhlasí.", 400);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const collectedAt = opts.input.collectedAtLocal
    ? parseWallClockInTz(opts.input.collectedAtLocal, tz)
    : null;
  const resultedAt = opts.input.resultedAtLocal
    ? parseWallClockInTz(opts.input.resultedAtLocal, tz)
    : null;
  if (!collectedAt && !resultedAt) {
    throw new LabServiceError(
      "Vyžaduje se čas odběru nebo čas výsledku.",
      400,
    );
  }

  const before = serializeLabPanel(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "LabPanel",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      await tx.labResult.deleteMany({ where: { panelId: opts.id } });
      const updated = await tx.labPanel.update({
        where: { id: opts.id },
        data: {
          title: opts.input.title.trim(),
          collectedAt,
          resultedAt,
          laboratory: emptyToNull(opts.input.laboratory),
          source: emptyToNull(opts.input.source),
          notes: emptyToNull(opts.input.notes),
          results: {
            create: opts.input.results.map(resultCreateData),
          },
        },
        include: { results: { orderBy: { createdAt: "asc" } } },
      });
      const serialized = serializeLabPanel(updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}
