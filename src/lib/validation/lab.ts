import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

export const labResultFlagSchema = z.enum([
  "low",
  "high",
  "normal",
  "abnormal_unspecified",
  "unknown",
]);

export const labReportStatusSchema = z.enum([
  "preliminary",
  "final",
  "corrected",
]);

export const labOrderStatusSchema = z.enum([
  "draft",
  "ordered",
  "partial",
  "done",
  "cancelled",
]);

export const labOrderPrioritySchema = z.enum(["routine", "statim"]);

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

const optionalAnalyteKey = z
  .string()
  .trim()
  .max(80)
  .optional()
  .nullable()
  .or(z.literal(""))
  .transform((v) => (v === "" || v == null ? null : v));

export const labResultInputSchema = z
  .object({
    analyteKey: optionalAnalyteKey,
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
  orderId: z
    .string()
    .uuid()
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((v) => (v === "" || v == null ? null : v)),
  title: z.string().trim().min(1).max(200),
  reportStatus: labReportStatusSchema.default("final"),
  collectedAtLocal: wallClockSchema.optional().or(z.literal("")),
  resultedAtLocal: wallClockSchema.optional().or(z.literal("")),
  laboratory: optionalString,
  source: optionalString,
  notes: optionalNotes,
  results: z.array(labResultInputSchema).min(1).max(100),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const labOrderItemSchema = z.object({
  analyteKey: optionalAnalyteKey,
  analyteLabel: z.string().trim().min(1).max(200),
  unit: optionalString,
  sortOrder: z.number().int().min(0).max(500).optional(),
});

export const labOrderWriteSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  status: labOrderStatusSchema.default("ordered"),
  priority: labOrderPrioritySchema.default("routine"),
  panelGroup: optionalString,
  orderedAtLocal: wallClockSchema.optional().or(z.literal("")),
  collectedAtLocal: wallClockSchema.optional().or(z.literal("")),
  laboratory: optionalString,
  indication: optionalString,
  notes: optionalNotes,
  items: z.array(labOrderItemSchema).min(1).max(200),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export const labAnalyteDefinitionUpdateSchema = z.object({
  referenceLow: optionalDecimal,
  referenceHigh: optionalDecimal,
  referenceLowFemale: optionalDecimal,
  referenceHighFemale: optionalDecimal,
  referenceLowMale: optionalDecimal,
  referenceHighMale: optionalDecimal,
  referenceText: optionalString.nullable(),
  isActive: z.boolean().optional(),
});

export type LabPanelWriteInput = z.infer<typeof labPanelWriteSchema>;
export type LabResultInput = z.infer<typeof labResultInputSchema>;
export type LabOrderWriteInput = z.infer<typeof labOrderWriteSchema>;
export type LabAnalyteDefinitionUpdateInput = z.infer<
  typeof labAnalyteDefinitionUpdateSchema
>;