import { z } from "zod";

const isoInstantSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/,
    "Neplatný ISO čas.",
  );

export const exportQuerySchema = z.object({
  patientId: z.string().uuid(),
  from: isoInstantSchema.optional(),
  to: isoInstantSchema.optional(),
  /** Wall-clock YYYY-MM-DD (patient TZ) alternative to ISO from/to. */
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  toDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const backupPasswordSchema = z.object({
  password: z.string().min(8).max(200),
});

export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
