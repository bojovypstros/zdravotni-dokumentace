import type { DiaryScaleDefinition, DiaryScaleReading } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { DEFAULT_TIMEZONE, parseWallClockInTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type {
  DiaryScaleDefinitionCreateInput,
  DiaryScaleReadingWriteInput,
  DiaryScaleSettingUpdateInput,
} from "@/lib/validation/symptom";
import { runAuditedMutation } from "@/server/services/audit";
import {
  SYSTEM_DIARY_SCALES,
  systemDiaryScaleCreateData,
} from "@/server/services/diary-scale-catalog";

export class DiaryScaleServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "DiaryScaleServiceError";
    this.status = status;
  }
}

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

export async function ensureSystemDiaryScales() {
  for (const seed of SYSTEM_DIARY_SCALES) {
    const existing = await prisma.diaryScaleDefinition.findFirst({
      where: { key: seed.key, patientId: null, isSystem: true },
    });
    if (existing) continue;
    await prisma.diaryScaleDefinition.create({
      data: systemDiaryScaleCreateData(seed),
    });
  }
}

export type PatientDiaryScale = {
  id: string;
  key: string;
  label: string;
  minValue: number;
  maxValue: number;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  isEnabled: boolean;
  patientId: string | null;
};

export function serializeDiaryScaleDefinition(
  d: DiaryScaleDefinition,
  opts?: { isEnabled?: boolean; minValue?: number; maxValue?: number },
): PatientDiaryScale {
  return {
    id: d.id,
    key: d.key,
    label: d.label,
    minValue: opts?.minValue ?? d.minValue,
    maxValue: opts?.maxValue ?? d.maxValue,
    sortOrder: d.sortOrder,
    isSystem: d.isSystem,
    isActive: d.isActive,
    isEnabled: opts?.isEnabled ?? true,
    patientId: d.patientId,
  };
}

export function serializeDiaryScaleReading(r: DiaryScaleReading) {
  return {
    id: r.id,
    patientId: r.patientId,
    values: (r.values ?? {}) as Record<string, number>,
    occurredAt: r.occurredAt.toISOString(),
    recordedAt: r.recordedAt.toISOString(),
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export type SerializedDiaryScaleReading = ReturnType<
  typeof serializeDiaryScaleReading
>;

export function formatDiaryScaleSummary(
  r: SerializedDiaryScaleReading,
  labels?: Map<string, string>,
): string {
  const parts = Object.entries(r.values)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const label = labels?.get(key) ?? key;
      return `${label} ${value}`;
    });
  return parts.length > 0 ? parts.join(" · ") : "deník škál";
}

/** List scales available to a patient (system + custom) with enable settings. */
export async function listPatientDiaryScales(patientId: string) {
  await ensureSystemDiaryScales();

  const [defs, settings] = await Promise.all([
    prisma.diaryScaleDefinition.findMany({
      where: {
        isActive: true,
        OR: [{ patientId: null, isSystem: true }, { patientId }],
      },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    }),
    prisma.diaryScaleSetting.findMany({ where: { patientId } }),
  ]);

  const settingByDef = new Map(settings.map((s) => [s.definitionId, s]));

  return defs.map((d) => {
    const setting = settingByDef.get(d.id);
    return serializeDiaryScaleDefinition(d, {
      isEnabled: setting?.isEnabled ?? true,
      minValue: setting?.minValue ?? undefined,
      maxValue: setting?.maxValue ?? undefined,
    });
  });
}

export async function createCustomDiaryScale(opts: {
  input: DiaryScaleDefinitionCreateInput;
  actorId: string;
  requestId?: string;
}) {
  await ensureSystemDiaryScales();
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  if (opts.input.minValue >= opts.input.maxValue) {
    throw new DiaryScaleServiceError("minValue musí být menší než maxValue.");
  }

  const clash = await prisma.diaryScaleDefinition.findFirst({
    where: {
      key: opts.input.key,
      OR: [
        { patientId: null, isSystem: true },
        { patientId: opts.input.patientId },
      ],
    },
  });
  if (clash) {
    throw new DiaryScaleServiceError("Škála s tímto klíčem už existuje.", 409);
  }

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "DiaryScaleDefinition",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.diaryScaleDefinition.create({
        data: {
          patientId: opts.input.patientId,
          key: opts.input.key,
          label: opts.input.label,
          minValue: opts.input.minValue,
          maxValue: opts.input.maxValue,
          sortOrder: opts.input.sortOrder,
          isSystem: false,
          isActive: true,
        },
      });
      const serialized = serializeDiaryScaleDefinition(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function upsertDiaryScaleSetting(opts: {
  input: DiaryScaleSettingUpdateInput;
  actorId: string;
  requestId?: string;
}) {
  await ensureSystemDiaryScales();
  const def = await prisma.diaryScaleDefinition.findUnique({
    where: { id: opts.input.definitionId },
  });
  if (!def || !def.isActive) {
    throw new DiaryScaleServiceError("Škála nenalezena.", 404);
  }
  if (def.patientId && def.patientId !== opts.input.patientId) {
    throw new DiaryScaleServiceError("Škála nepatří tomuto pacientovi.", 403);
  }
  if (!def.isSystem && def.patientId !== opts.input.patientId) {
    throw new DiaryScaleServiceError("Škála nenalezena.", 404);
  }

  const minValue =
    opts.input.minValue === undefined
      ? undefined
      : opts.input.minValue;
  const maxValue =
    opts.input.maxValue === undefined
      ? undefined
      : opts.input.maxValue;
  if (
    minValue != null &&
    maxValue != null &&
    minValue >= maxValue
  ) {
    throw new DiaryScaleServiceError("minValue musí být menší než maxValue.");
  }

  const existing = await prisma.diaryScaleSetting.findUnique({
    where: {
      patientId_definitionId: {
        patientId: opts.input.patientId,
        definitionId: opts.input.definitionId,
      },
    },
  });

  const before = existing
    ? {
        id: existing.id,
        patientId: existing.patientId,
        definitionId: existing.definitionId,
        isEnabled: existing.isEnabled,
        minValue: existing.minValue,
        maxValue: existing.maxValue,
      }
    : {
        patientId: opts.input.patientId,
        definitionId: opts.input.definitionId,
        isEnabled: true,
        minValue: null,
        maxValue: null,
      };

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "DiaryScaleSetting",
    action: existing ? "update" : "create",
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const row = await tx.diaryScaleSetting.upsert({
        where: {
          patientId_definitionId: {
            patientId: opts.input.patientId,
            definitionId: opts.input.definitionId,
          },
        },
        create: {
          patientId: opts.input.patientId,
          definitionId: opts.input.definitionId,
          isEnabled: opts.input.isEnabled ?? true,
          minValue: minValue === undefined ? null : minValue,
          maxValue: maxValue === undefined ? null : maxValue,
        },
        update: {
          ...(opts.input.isEnabled !== undefined
            ? { isEnabled: opts.input.isEnabled }
            : {}),
          ...(minValue !== undefined ? { minValue } : {}),
          ...(maxValue !== undefined ? { maxValue } : {}),
        },
      });
      const after = {
        id: row.id,
        patientId: row.patientId,
        definitionId: row.definitionId,
        isEnabled: row.isEnabled,
        minValue: row.minValue,
        maxValue: row.maxValue,
      };
      return { result: after, entityId: row.id, after };
    },
  });
}

async function resolveEnabledScales(patientId: string) {
  const scales = await listPatientDiaryScales(patientId);
  return scales.filter((s) => s.isEnabled);
}

function validateReadingValues(
  values: Record<string, number>,
  enabled: PatientDiaryScale[],
) {
  const byKey = new Map(enabled.map((s) => [s.key, s]));
  const keys = Object.keys(values);
  if (keys.length === 0) {
    throw new DiaryScaleServiceError("Zadejte alespoň jednu škálu.");
  }
  const cleaned: Record<string, number> = {};
  for (const [key, raw] of Object.entries(values)) {
    const scale = byKey.get(key);
    if (!scale) {
      throw new DiaryScaleServiceError(
        `Škála „${key}“ není dostupná nebo je vypnutá.`,
      );
    }
    if (!Number.isFinite(raw)) {
      throw new DiaryScaleServiceError(`Neplatná hodnota pro ${scale.label}.`);
    }
    if (raw < scale.minValue || raw > scale.maxValue) {
      throw new DiaryScaleServiceError(
        `${scale.label}: hodnota musí být ${scale.minValue}–${scale.maxValue}.`,
      );
    }
    cleaned[key] = raw;
  }
  return cleaned;
}

export async function listDiaryScaleReadings(opts: {
  patientId: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const rows = await prisma.diaryScaleReading.findMany({
    where: {
      patientId: opts.patientId,
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
  return rows.map(serializeDiaryScaleReading);
}

export async function createDiaryScaleReading(opts: {
  input: DiaryScaleReadingWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) return null;

  const enabled = await resolveEnabledScales(opts.input.patientId);
  const values = validateReadingValues(opts.input.values, enabled);

  const tz = opts.timeZone ?? patient.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "DiaryScaleReading",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.diaryScaleReading.create({
        data: {
          patientId: opts.input.patientId,
          values: values as Prisma.InputJsonValue,
          occurredAt,
          recordedAt: new Date(),
          notes: emptyToNull(opts.input.notes),
        },
      });
      return {
        result: serializeDiaryScaleReading(created),
        entityId: created.id,
        after: serializeDiaryScaleReading(created),
      };
    },
  });
}

export async function updateDiaryScaleReading(opts: {
  id: string;
  input: DiaryScaleReadingWriteInput;
  actorId: string;
  requestId?: string;
  timeZone?: string;
}) {
  const existing = await prisma.diaryScaleReading.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;
  if (existing.patientId !== opts.input.patientId) {
    throw new DiaryScaleServiceError("patientId nesouhlasí.", 400);
  }

  // Allow keys that were already stored even if later disabled (correction).
  const existingKeys = Object.keys(
    (existing.values ?? {}) as Record<string, number>,
  );
  const scalesForValidation = await listPatientDiaryScales(opts.input.patientId);
  const allowed = scalesForValidation.filter(
    (s) => s.isEnabled || existingKeys.includes(s.key),
  );
  const values = validateReadingValues(opts.input.values, allowed);

  const patient = await prisma.patient.findUnique({
    where: { id: existing.patientId },
  });
  const tz = opts.timeZone ?? patient?.timezone ?? DEFAULT_TIMEZONE;
  const occurredAt = parseWallClockInTz(opts.input.occurredAtLocal, tz);
  const before = serializeDiaryScaleReading(existing);
  const isCorrection = Boolean(opts.input.reason && opts.input.reason.trim());

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "DiaryScaleReading",
    action: isCorrection ? "correction" : "update",
    reason: emptyToNull(opts.input.reason),
    before,
    requestId: opts.requestId,
    changeSummary: isCorrection ? "In-place correction" : undefined,
    mutate: async (tx) => {
      const updated = await tx.diaryScaleReading.update({
        where: { id: opts.id },
        data: {
          values: values as Prisma.InputJsonValue,
          occurredAt,
          notes: emptyToNull(opts.input.notes),
        },
      });
      return {
        result: serializeDiaryScaleReading(updated),
        entityId: updated.id,
        after: serializeDiaryScaleReading(updated),
      };
    },
  });
}
