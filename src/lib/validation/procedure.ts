import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

export const procedureStatusSchema = z.enum([
  "planned",
  "completed",
  "cancelled",
  "unknown",
]);

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalNotes = z.string().trim().max(2000).optional().or(z.literal(""));

export const procedureWriteSchema = z.object({
  patientId: z.string().uuid(),
  display: z.string().trim().min(1).max(300),
  status: procedureStatusSchema.default("completed"),
  occurredAtLocal: wallClockSchema,
  performerLabel: optionalString,
  outcome: optionalString,
  notes: optionalNotes,
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ProcedureWriteInput = z.infer<typeof procedureWriteSchema>;
