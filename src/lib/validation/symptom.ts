import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalNotes = z.string().trim().max(2000).optional().or(z.literal(""));
const optionalWallClock = wallClockSchema.optional().or(z.literal(""));

export const symptomEntryWriteSchema = z.object({
  patientId: z.string().uuid(),
  symptom: z.string().trim().min(1).max(200),
  intensity: z.number().finite().min(0).max(100).optional().nullable(),
  intensityScale: optionalString,
  location: optionalString,
  character: optionalString,
  onsetAtLocal: optionalWallClock,
  endedAtLocal: optionalWallClock,
  occurredAtLocal: wallClockSchema,
  context: optionalString,
  notes: optionalNotes,
  /** When set on PATCH, audit action becomes correction. */
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SymptomEntryWriteInput = z.infer<typeof symptomEntryWriteSchema>;

export const diaryScaleDefinitionCreateSchema = z.object({
  patientId: z.string().uuid(),
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(
      /^[a-z][a-z0-9_]*$/,
      "Klíč: malá písmena, číslice a podtržítko (začíná písmenem).",
    ),
  label: z.string().trim().min(1).max(120),
  minValue: z.number().int().min(0).max(100).default(0),
  maxValue: z.number().int().min(1).max(100).default(10),
  sortOrder: z.number().int().min(0).max(1000).default(100),
});

export type DiaryScaleDefinitionCreateInput = z.infer<
  typeof diaryScaleDefinitionCreateSchema
>;

export const diaryScaleSettingUpdateSchema = z.object({
  patientId: z.string().uuid(),
  definitionId: z.string().uuid(),
  isEnabled: z.boolean().optional(),
  minValue: z.number().int().min(0).max(100).optional().nullable(),
  maxValue: z.number().int().min(1).max(100).optional().nullable(),
});

export type DiaryScaleSettingUpdateInput = z.infer<
  typeof diaryScaleSettingUpdateSchema
>;

export const diaryScaleReadingWriteSchema = z.object({
  patientId: z.string().uuid(),
  /** Map of scale key → numeric score. */
  values: z.record(z.string(), z.number().finite()),
  occurredAtLocal: wallClockSchema,
  notes: optionalNotes,
  /** When set on PATCH, audit action becomes correction. */
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type DiaryScaleReadingWriteInput = z.infer<
  typeof diaryScaleReadingWriteSchema
>;
