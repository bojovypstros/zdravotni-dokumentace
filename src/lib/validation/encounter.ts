import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

export const encounterTypeSchema = z.enum([
  "hospitalization",
  "outpatient",
  "emergency",
  "self_monitoring",
  "other",
]);

export const encounterStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalNotes = z.string().trim().max(2000).optional().or(z.literal(""));

export const encounterWriteSchema = z
  .object({
    patientId: z.string().uuid(),
    type: encounterTypeSchema,
    title: z.string().trim().min(1).max(200),
    startAtLocal: wallClockSchema,
    endAtLocal: wallClockSchema.optional().or(z.literal("")),
    status: encounterStatusSchema.default("planned"),
    facilityLabel: optionalString,
    reason: optionalString,
    notes: optionalNotes,
    correctionReason: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((val, ctx) => {
    if (val.endAtLocal && val.endAtLocal < val.startAtLocal) {
      ctx.addIssue({
        code: "custom",
        message: "Konec nesmí být před začátkem.",
        path: ["endAtLocal"],
      });
    }
  });

export type EncounterWriteInput = z.infer<typeof encounterWriteSchema>;
