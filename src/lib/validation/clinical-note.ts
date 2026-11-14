import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

export const clinicalNoteTypeSchema = z.enum([
  "DIARY",
  "VISIT_SUMMARY",
  "MEDICATION_NOTE",
  "RESULT_NOTE",
  "CARE_NOTE",
  "OTHER",
]);

export const clinicalNoteSourceSchema = z.enum(["manual", "import", "other"]);

const optionalTitle = z.string().trim().max(200).optional().or(z.literal(""));

export const clinicalNoteWriteSchema = z.object({
  patientId: z.string().uuid(),
  noteType: clinicalNoteTypeSchema,
  title: optionalTitle,
  body: z.string().trim().min(1).max(20000),
  occurredAtLocal: wallClockSchema,
  source: clinicalNoteSourceSchema.default("manual"),
  /** When set on PATCH, audit action becomes correction. */
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ClinicalNoteWriteInput = z.infer<typeof clinicalNoteWriteSchema>;
