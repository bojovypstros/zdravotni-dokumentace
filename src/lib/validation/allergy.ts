import { z } from "zod";

export const allergySeveritySchema = z.enum([
  "mild",
  "moderate",
  "severe",
  "unknown",
]);
export const allergyStatusSchema = z.enum([
  "active",
  "inactive",
  "unconfirmed",
]);
export const allergyVerificationSchema = z.enum([
  "confirmed_by_clinician",
  "patient_reported",
  "unknown",
]);

export const allergyWriteSchema = z.object({
  patientId: z.string().uuid(),
  substance: z.string().trim().min(1).max(200),
  reaction: z.string().trim().max(500).optional().or(z.literal("")),
  severity: allergySeveritySchema.default("unknown"),
  status: allergyStatusSchema.default("active"),
  verification: allergyVerificationSchema.default("patient_reported"),
  onsetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type AllergyWriteInput = z.infer<typeof allergyWriteSchema>;
