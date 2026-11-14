import { z } from "zod";

export const documentTypeSchema = z.enum([
  "lab_result",
  "report",
  "imaging",
  "referral",
  "other",
]);

export const documentMetaSchema = z.object({
  patientId: z.string().uuid(),
  documentType: documentTypeSchema.default("other"),
  documentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  sourceLabel: z.string().max(200).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

export type DocumentMetaInput = z.infer<typeof documentMetaSchema>;
