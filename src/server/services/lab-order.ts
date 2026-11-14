import type { LabOrder, LabOrderItem, LabOrderStatus, Prisma } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { LabOrderWriteInput } from "@/lib/validation/lab";
import { runAuditedMutation } from "@/server/services/audit";
import {
  LAB_PANEL_PRESETS,
  getSystemAnalyteByKey,
} from "@/server/services/lab-catalog";

export class LabOrderServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "LabOrderServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

type LabOrderWithRelations = LabOrder & {
  items: LabOrderItem[];
  panels?: { id: string }[];
};

export function serializeLabOrderItem(item: LabOrderItem) {
  return {
    id: item.id,
    analyteKey: item.analyteKey,
    analyteLabel: item.analyteLabel,
    unit: item.unit,
    sortOrder: item.sortOrder,
  };
}

export function serializeLabOrder(order: LabOrderWithRelations) {
  return {
    id: order.id,
    patientId: order.patientId,
    title: order.title,
    status: order.status,
    priority: order.priority,
    panelGroup: order.panelGroup,
    orderedAt: order.orderedAt?.toISOString() ?? null,
    collectedAt: order.collectedAt?.toISOString() ?? null,
    laboratory: order.laboratory,
    indication: order.indication,
    notes: order.notes,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map(serializeLabOrderItem),
    resultPanelIds: (order.panels ?? []).map((p) => p.id),
  };
}

export type SerializedLabOrder = ReturnType<typeof serializeLabOrder>;

export function itemsFromPanelPreset(panelGroupKey: string) {
  const preset = LAB_PANEL_PRESETS.find((p) => p.key === panelGroupKey);
  if (!preset) {
    throw new LabOrderServiceError("Neznámý panel v katalogu.", 400);
  }
  return preset.analyteKeys.map((key, idx) => {
    const seed = getSystemAnalyteByKey(key);
    if (!seed) {
      throw new LabOrderServiceError(`Chybí analyt v katalogu: ${key}`, 500);
    }
    return {
      analyteKey: key,
      analyteLabel: seed.label,
      unit: seed.unit ?? null,
      sortOrder: idx,
    };
  });
}

export async function syncLabOrderStatusFromResults(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.labOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      panels: { include: { results: true } },
    },
  });
  if (!order) return;
  if (order.status === "draft" || order.status === "cancelled") return;

  const keys = new Set<string>();
  const labels = new Set<string>();
  for (const panel of order.panels) {
    for (const r of panel.results) {
      if (r.analyteKey) keys.add(r.analyteKey);
      labels.add(r.analyte.trim().toLowerCase());
    }
  }

  const total = order.items.length;
  if (total === 0) return;

  let covered = 0;
  for (const item of order.items) {
    const label = item.analyteLabel.trim().toLowerCase();
    if (item.analyteKey && keys.has(item.analyteKey)) covered++;
    else if (labels.has(label)) covered++;
  }

  let next: LabOrderStatus;
  if (covered === 0) next = "ordered";
  else if (covered < total) next = "partial";
  else next = "done";

  if (order.status !== next) {
    await tx.labOrder.update({
      where: { id: orderId },
      data: { status: next },
    });
  }
}

function buildItemCreates(items: LabOrderWriteInput["items"]) {
  return items.map((item, idx) => ({
    analyteKey: emptyToNull(item.analyteKey),
    analyteLabel: item.analyteLabel.trim(),
    unit: emptyToNull(item.unit),
    sortOrder: item.sortOrder ?? idx,
  }));
}

export async function listLabOrders(opts: { patientId: string }) {
  const rows = await prisma.labOrder.findMany({
    where: { patientId: opts.patientId },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      panels: { select: { id: true } },
    },
    orderBy: [{ orderedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(serializeLabOrder);
}

export async function getLabOrder(id: string) {
  const row = await prisma.labOrder.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      panels: { select: { id: true } },
    },
  });
  return row ? serializeLabOrder(row) : null;
}

export async function createLabOrder(opts: {
  input: LabOrderWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const tz = opts.timeZone ?? patient.timezone ?? DEFAULT_TIMEZONE;
  const orderedAt =
    opts.input.orderedAtLocal && opts.input.orderedAtLocal !== ""
      ? parseWallClockInTz(opts.input.orderedAtLocal, tz)
      : null;
  const collectedAt =
    opts.input.collectedAtLocal && opts.input.collectedAtLocal !== ""
      ? parseWallClockInTz(opts.input.collectedAtLocal, tz)
      : null;

  if (opts.input.items.length === 0) {
    throw new LabOrderServiceError(
      "Žádanka vyžaduje alespoň jeden analyt.",
      400,
    );
  }

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "LabOrder",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.labOrder.create({
        data: {
          patientId: opts.input.patientId,
          title: opts.input.title.trim(),
          status: opts.input.status,
          priority: opts.input.priority,
          panelGroup: emptyToNull(opts.input.panelGroup),
          orderedAt,
          collectedAt,
          laboratory: emptyToNull(opts.input.laboratory),
          indication: emptyToNull(opts.input.indication),
          notes: emptyToNull(opts.input.notes),
          items: { create: buildItemCreates(opts.input.items) },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          panels: { select: { id: true } },
        },
      });
      const serialized = serializeLabOrder(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function updateLabOrder(opts: {
  id: string;
  input: LabOrderWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.labOrder.findUnique({
    where: { id: opts.id },
    include: { items: true, panels: { select: { id: true } } },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new LabOrderServiceError("patientId nesouhlasí.", 400);
  }

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const orderedAt =
    opts.input.orderedAtLocal && opts.input.orderedAtLocal !== ""
      ? parseWallClockInTz(opts.input.orderedAtLocal, tz)
      : null;
  const collectedAt =
    opts.input.collectedAtLocal && opts.input.collectedAtLocal !== ""
      ? parseWallClockInTz(opts.input.collectedAtLocal, tz)
      : null;

  if (opts.input.items.length === 0) {
    throw new LabOrderServiceError(
      "Žádanka vyžaduje alespoň jeden analyt.",
      400,
    );
  }

  const before = serializeLabOrder(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "LabOrder",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      await tx.labOrderItem.deleteMany({ where: { orderId: opts.id } });
      const updated = await tx.labOrder.update({
        where: { id: opts.id },
        data: {
          title: opts.input.title.trim(),
          status: opts.input.status,
          priority: opts.input.priority,
          panelGroup: emptyToNull(opts.input.panelGroup),
          orderedAt,
          collectedAt,
          laboratory: emptyToNull(opts.input.laboratory),
          indication: emptyToNull(opts.input.indication),
          notes: emptyToNull(opts.input.notes),
          items: { create: buildItemCreates(opts.input.items) },
        },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          panels: { select: { id: true } },
        },
      });
      await syncLabOrderStatusFromResults(tx, opts.id);
      const refreshed = await tx.labOrder.findUnique({
        where: { id: opts.id },
        include: {
          items: { orderBy: { sortOrder: "asc" } },
          panels: { select: { id: true } },
        },
      });
      const serialized = serializeLabOrder(refreshed ?? updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}