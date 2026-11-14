import { z } from "zod";

export const observationCategorySchema = z.enum([
  "vital_sign",
  "laboratory",
  "body_measurement",
  "symptom_score",
  "custom",
]);

export const observationValueTypeSchema = z.enum([
  "quantity",
  "integer",
  "decimal",
  "boolean",
  "text",
  "ratio",
]);

export const observationSourceSchema = z.enum([
  "manual",
  "device_import",
  "document_import",
]);

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalNotes = z.string().trim().max(2000).optional().or(z.literal(""));

/** Wall-clock local ISO without offset: 2026-11-14T16:30 — interpreted in patient TZ. */
export const wallClockSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
    "Neplatný formát data a času.",
  );

export const observationDefinitionCreateSchema = z.object({
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
  category: observationCategorySchema.default("custom"),
  valueType: observationValueTypeSchema.default("decimal"),
  canonicalUnit: z.string().trim().min(1).max(40),
  allowedUnits: z.array(z.string().trim().min(1).max(40)).min(1).max(20).optional(),
  displayPrecision: z.number().int().min(0).max(6).default(1),
  supportsPair: z.boolean().default(false),
  lowerReference: z.number().finite().optional().nullable(),
  upperReference: z.number().finite().optional().nullable(),
});

export type ObservationDefinitionCreateInput = z.infer<
  typeof observationDefinitionCreateSchema
>;

export const observationDefinitionUpdateSchema = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  canonicalUnit: z.string().trim().min(1).max(40).optional(),
  allowedUnits: z.array(z.string().trim().min(1).max(40)).min(1).max(20).optional(),
  displayPrecision: z.number().int().min(0).max(6).optional(),
  supportsPair: z.boolean().optional(),
  lowerReference: z.number().finite().optional().nullable(),
  upperReference: z.number().finite().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type ObservationDefinitionUpdateInput = z.infer<
  typeof observationDefinitionUpdateSchema
>;

export const observationWriteSchema = z
  .object({
    patientId: z.string().uuid(),
    definitionId: z.string().uuid(),
    numericValue: z.number().finite().optional().nullable(),
    secondaryNumericValue: z.number().finite().optional().nullable(),
    textValue: z.string().trim().max(500).optional().nullable().or(z.literal("")),
    unit: z.string().trim().min(1).max(40),
    /** Wall clock in patient timezone (Europe/Prague default). */
    occurredAtLocal: wallClockSchema,
    method: optionalString,
    bodySite: optionalString,
    context: optionalString,
    source: observationSourceSchema.default("manual"),
    notes: optionalNotes,
    /** When set on PATCH, audit action becomes correction. */
    reason: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const hasNumeric =
      data.numericValue !== undefined && data.numericValue !== null;
    const hasText =
      data.textValue !== undefined &&
      data.textValue !== null &&
      data.textValue !== "";
    if (!hasNumeric && !hasText) {
      ctx.addIssue({
        code: "custom",
        message: "Zadejte číselnou nebo textovou hodnotu.",
        path: ["numericValue"],
      });
    }
  });

export type ObservationWriteInput = z.infer<typeof observationWriteSchema>;
