import type { LabAnalyteDefinition, LabPanel, LabResult, Prisma } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import {
  resolveCatalogReferenceRange,
  type SexForLabRange,
} from "@/lib/lab/reference-range";
import type {
  LabPanelWriteInput,
  LabResultInput,
} from "@/lib/validation/lab";
import { runAuditedMutation } from "@/server/services/audit";
import { ensureSystemLabAnalyteDefinitions } from "@/server/services/lab-analyte-definition";
import { syncLabOrderStatusFromResults } from "@/server/services/lab-order";

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

function defToRangeFields(def: LabAnalyteDefinition) {
  return {
    referenceLow: decimalToNumber(def.referenceLow),
    referenceHigh: decimalToNumber(def.referenceHigh),
    referenceLowFemale: decimalToNumber(def.referenceLowFemale),
    referenceHighFemale: decimalToNumber(def.referenceHighFemale),
    referenceLowMale: decimalToNumber(def.referenceLowMale),
    referenceHighMale: decimalToNumber(def.referenceHighMale),
    referenceText: def.referenceText,
  };
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
    analyteKey: r.analyteKey,
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
    orderId: panel.orderId,
    title: panel.title,
    reportStatus: panel.reportStatus,
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

type CatalogIndex = {
  byKey: Map<string, LabAnalyteDefinition>;
  byLabel: Map<string, LabAnalyteDefinition>;
};

function buildCatalogIndex(defs: LabAnalyteDefinition[]): CatalogIndex {
  const byKey = new Map<string, LabAnalyteDefinition>();
  const byLabel = new Map<string, LabAnalyteDefinition>();
  for (const d of defs) {
    byKey.set(d.key, d);
    byLabel.set(d.label.trim().toLowerCase(), d);
  }
  return { byKey, byLabel };
}

function findDefForResult(
  input: LabResultInput,
  index: CatalogIndex,
): LabAnalyteDefinition | undefined {
  if (input.analyteKey && index.byKey.has(input.analyteKey)) {
    return index.byKey.get(input.analyteKey);
  }
  const labelKey = input.analyte.trim().toLowerCase();
  return index.byLabel.get(labelKey);
}

function snapshotReferences(
  input: LabResultInput,
  index: CatalogIndex,
  sexAtBirth: SexForLabRange,
): Pick<
  LabResultInput,
  "referenceLow" | "referenceHigh" | "referenceText" | "unit" | "analyteKey"
> {
  let referenceLow = input.referenceLow;
  let referenceHigh = input.referenceHigh;
  let referenceText = input.referenceText ?? null;
  let unit = input.unit;
  let analyteKey = input.analyteKey ?? null;

  const needsSnapshot =
    referenceLow == null &&
    referenceHigh == null &&
    (referenceText == null || referenceText === "");

  const def = findDefForResult(input, index);
  if (def) {
    if (!analyteKey) analyteKey = def.key;
    if (!unit) unit = def.unit ?? undefined;
    if (needsSnapshot) {
      const snap = resolveCatalogReferenceRange(
        defToRangeFields(def),
        sexAtBirth,
      );
      referenceLow = snap.referenceLow;
      referenceHigh = snap.referenceHigh;
      referenceText = snap.referenceText;
    }
  }

  return {
    analyteKey: analyteKey ?? null,
    referenceLow,
    referenceHigh,
    referenceText: referenceText || undefined,
    unit: unit || undefined,
  };
}

function resultCreateData(
  input: LabResultInput,
  index: CatalogIndex,
  sexAtBirth: SexForLabRange,
) {
  const snap = snapshotReferences(input, index, sexAtBirth);
  const valueNumeric = input.valueNumeric;
  const referenceLow = snap.referenceLow;
  const referenceHigh = snap.referenceHigh;
  const flag = deriveLabFlag({
    valueNumeric,
    referenceLow,
    referenceHigh,
    explicitFlag: input.flag,
  });
  return {
    analyteKey: emptyToNull(snap.analyteKey),
    analyte: input.analyte.trim(),
    valueNumeric:
      valueNumeric == null ? null : new PrismaNS.Decimal(valueNumeric),
    valueText: emptyToNull(input.valueText),
    unit: emptyToNull(snap.unit),
    referenceLow:
      referenceLow == null ? null : new PrismaNS.Decimal(referenceLow),
    referenceHigh:
      referenceHigh == null ? null : new PrismaNS.Decimal(referenceHigh),
    referenceText: emptyToNull(snap.referenceText),
    flag,
    notes: emptyToNull(input.notes),
  };
}

async function loadCatalog(tx: Prisma.TransactionClient) {
  await ensureSystemLabAnalyteDefinitions(tx);
  return tx.labAnalyteDefinition.findMany({
    where: { isActive: true },
  });
}

async function validateOrderLink(
  tx: Prisma.TransactionClient,
  orderId: string | null | undefined,
  patientId: string,
) {
  if (!orderId) return null;
  const order = await tx.labOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new LabServiceError("Žádanka nenalezena.", 404);
  }
  if (order.patientId !== patientId) {
    throw new LabServiceError("Žádanka nepatří tomuto pacientovi.", 400);
  }
  return orderId;
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

  const sexAtBirth = patient.sexAtBirth as SexForLabRange;

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "LabPanel",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const orderId = await validateOrderLink(
        tx,
        opts.input.orderId,
        opts.input.patientId,
      );
      const catalog = await loadCatalog(tx);
      const index = buildCatalogIndex(catalog);
      const created = await tx.labPanel.create({
        data: {
          patientId: opts.input.patientId,
          orderId,
          title: opts.input.title.trim(),
          reportStatus: opts.input.reportStatus,
          collectedAt,
          resultedAt,
          laboratory: emptyToNull(opts.input.laboratory),
          source: emptyToNull(opts.input.source),
          notes: emptyToNull(opts.input.notes),
          results: {
            create: opts.input.results.map((r) =>
              resultCreateData(r, index, sexAtBirth),
            ),
          },
        },
        include: { results: { orderBy: { createdAt: "asc" } } },
      });
      if (orderId) {
        await syncLabOrderStatusFromResults(tx, orderId);
      }
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

  const sexAtBirth = patient?.sexAtBirth as SexForLabRange;
  const before = serializeLabPanel(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());
  const previousOrderId = existing.orderId;

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
      const orderId = await validateOrderLink(
        tx,
        opts.input.orderId,
        opts.input.patientId,
      );
      const catalog = await loadCatalog(tx);
      const index = buildCatalogIndex(catalog);
      await tx.labResult.deleteMany({ where: { panelId: opts.id } });
      const updated = await tx.labPanel.update({
        where: { id: opts.id },
        data: {
          orderId,
          title: opts.input.title.trim(),
          reportStatus: opts.input.reportStatus,
          collectedAt,
          resultedAt,
          laboratory: emptyToNull(opts.input.laboratory),
          source: emptyToNull(opts.input.source),
          notes: emptyToNull(opts.input.notes),
          results: {
            create: opts.input.results.map((r) =>
              resultCreateData(r, index, sexAtBirth),
            ),
          },
        },
        include: { results: { orderBy: { createdAt: "asc" } } },
      });
      const orderIds = new Set<string>();
      if (orderId) orderIds.add(orderId);
      if (previousOrderId && previousOrderId !== orderId) {
        orderIds.add(previousOrderId);
      }
      for (const oid of orderIds) {
        await syncLabOrderStatusFromResults(tx, oid);
      }
      const serialized = serializeLabPanel(updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}