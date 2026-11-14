import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

export const labResultFlagSchema = z.enum([
  "low",
  "high",
  "normal",
  "abnormal_unspecified",
  "unknown",
]);

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalNotes = z.string().trim().max(2000).optional().or(z.literal(""));
const optionalDecimal = z
  .union([z.number(), z.string()])
  .optional()
  .nullable()
  .transform((v) => {
    if (v === undefined || v === null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

export const labResultInputSchema = z
  .object({
    analyte: z.string().trim().min(1).max(200),
    valueNumeric: optionalDecimal,
    valueText: optionalString,
    unit: optionalString,
    referenceLow: optionalDecimal,
    referenceHigh: optionalDecimal,
    referenceText: optionalString,
    flag: labResultFlagSchema.optional(),
    notes: optionalNotes,
  })
  .superRefine((val, ctx) => {
    if (val.valueNumeric == null && !(val.valueText && val.valueText.trim())) {
      ctx.addIssue({
        code: "custom",
        message: "Výsledek vyžaduje valueNumeric nebo valueText.",
        path: ["valueNumeric"],
      });
    }
  });

export const labPanelWriteSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  collectedAtLocal: wallClockSchema.optional().or(z.literal("")),
  resultedAtLocal: wallClockSchema.optional().or(z.literal("")),
  laboratory: optionalString,
  source: optionalString,
  notes: optionalNotes,
  results: z.array(labResultInputSchema).min(1).max(100),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type LabPanelWriteInput = z.infer<typeof labPanelWriteSchema>;
export type LabResultInput = z.infer<typeof labResultInputSchema>;
