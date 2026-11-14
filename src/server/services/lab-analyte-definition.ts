import type { LabAnalyteDefinition, Prisma } from "@prisma/client";
import { Prisma as PrismaNS } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { LabAnalyteDefinitionUpdateInput } from "@/lib/validation/lab";
import { runAuditedMutation } from "@/server/services/audit";
import {
  SYSTEM_LAB_ANALYTES,
  systemLabAnalyteCreateData,
} from "@/server/services/lab-catalog";

export class LabAnalyteDefinitionServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "LabAnalyteDefinitionServiceError";
    this.status = status;
  }
}

function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "number" ? value : Number(value);
}

export function serializeLabAnalyteDefinition(d: LabAnalyteDefinition) {
  return {
    id: d.id,
    key: d.key,
    label: d.label,
    abbreviation: d.abbreviation,
    unit: d.unit,
    panelGroup: d.panelGroup,
    sortOrder: d.sortOrder,
    referenceLow: decimalToNumber(d.referenceLow),
    referenceHigh: decimalToNumber(d.referenceHigh),
    referenceLowFemale: decimalToNumber(d.referenceLowFemale),
    referenceHighFemale: decimalToNumber(d.referenceHighFemale),
    referenceLowMale: decimalToNumber(d.referenceLowMale),
    referenceHighMale: decimalToNumber(d.referenceHighMale),
    referenceText: d.referenceText,
    sourceNote: d.sourceNote,
    isSystem: d.isSystem,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export async function ensureSystemLabAnalyteDefinitions(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  for (const def of SYSTEM_LAB_ANALYTES) {
    const existing = await tx.labAnalyteDefinition.findFirst({
      where: { key: def.key, isSystem: true },
    });
    if (existing) continue;
    try {
      await tx.labAnalyteDefinition.create({
        data: systemLabAnalyteCreateData(def),
      });
    } catch (err) {
      if (
        err instanceof PrismaNS.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        continue;
      }
      throw err;
    }
  }
}

export async function listLabAnalyteDefinitions(opts?: {
  activeOnly?: boolean;
}) {
  await ensureSystemLabAnalyteDefinitions();
  const rows = await prisma.labAnalyteDefinition.findMany({
    where: opts?.activeOnly ? { isActive: true } : undefined,
    orderBy: [
      { panelGroup: "asc" },
      { sortOrder: "asc" },
      { label: "asc" },
    ],
  });
  return rows.map(serializeLabAnalyteDefinition);
}

export async function getLabAnalyteDefinitionByKey(key: string) {
  await ensureSystemLabAnalyteDefinitions();
  const row = await prisma.labAnalyteDefinition.findUnique({ where: { key } });
  return row ? serializeLabAnalyteDefinition(row) : null;
}

function decOrNull(v: number | null | undefined) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  return new PrismaNS.Decimal(v);
}

export async function updateLabAnalyteDefinition(opts: {
  id: string;
  input: LabAnalyteDefinitionUpdateInput;
  actorId: string;
  requestId?: string;
}) {
  const existing = await prisma.labAnalyteDefinition.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (!existing.isSystem) {
    throw new LabAnalyteDefinitionServiceError(
      "Úpravy jsou povoleny jen pro systémový katalog.",
      403,
    );
  }

  const before = serializeLabAnalyteDefinition(existing);

  return runAuditedMutation({
    patientId: null,
    actorId: opts.actorId,
    entityType: "LabAnalyteDefinition",
    action: "update",
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const data: Prisma.LabAnalyteDefinitionUpdateInput = {};
      if (opts.input.referenceLow !== undefined) {
        data.referenceLow = decOrNull(opts.input.referenceLow);
      }
      if (opts.input.referenceHigh !== undefined) {
        data.referenceHigh = decOrNull(opts.input.referenceHigh);
      }
      if (opts.input.referenceLowFemale !== undefined) {
        data.referenceLowFemale = decOrNull(opts.input.referenceLowFemale);
      }
      if (opts.input.referenceHighFemale !== undefined) {
        data.referenceHighFemale = decOrNull(opts.input.referenceHighFemale);
      }
      if (opts.input.referenceLowMale !== undefined) {
        data.referenceLowMale = decOrNull(opts.input.referenceLowMale);
      }
      if (opts.input.referenceHighMale !== undefined) {
        data.referenceHighMale = decOrNull(opts.input.referenceHighMale);
      }
      if (opts.input.referenceText !== undefined) {
        data.referenceText = opts.input.referenceText;
      }
      if (opts.input.isActive !== undefined) data.isActive = opts.input.isActive;

      const updated = await tx.labAnalyteDefinition.update({
        where: { id: opts.id },
        data,
      });
      const serialized = serializeLabAnalyteDefinition(updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}
