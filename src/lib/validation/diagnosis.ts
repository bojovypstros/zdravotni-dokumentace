import { z } from "zod";

export const diagnosisStatusSchema = z.enum([
  "active",
  "in_remission",
  "resolved",
  "unconfirmed",
  "historical",
]);

export const diagnosisWriteSchema = z.object({
  patientId: z.string().uuid(),
  display: z.string().trim().min(1).max(200),
  codeSystem: z.string().trim().max(80).optional().or(z.literal("")),
  code: z.string().trim().max(80).optional().or(z.literal("")),
  status: diagnosisStatusSchema.default("active"),
  onsetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  resolvedDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  source: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type DiagnosisWriteInput = z.infer<typeof diagnosisWriteSchema>;
