import { z } from "zod";

const codeSchema = z.enum([
  "FALL_RISK",
  "NPO",
  "ISOLATION",
  "CODE_STATUS",
  "ANTICOAGULATION",
  "RESTRICTED_EXTREMITY",
  "ASPIRATION_RISK",
  "SEIZURE_PRECAUTIONS",
  "LATEX_SENSITIVITY",
  "IMPLANT_DEVICE",
  "PREGNANCY",
  "CUSTOM",
]);

export const criticalFlagWriteSchema = z
  .object({
    patientId: z.string().uuid(),
    code: codeSchema,
    status: z.enum(["active", "inactive"]).default("active"),
    severity: z.enum(["critical", "high", "medium"]).optional(),
    detail: z.string().trim().max(500).optional().or(z.literal("")),
    note: z.string().trim().max(2000).optional().or(z.literal("")),
    validFrom: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.literal(""))
      .or(z.null()),
    validTo: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.literal(""))
      .or(z.null()),
  })
  .superRefine((data, ctx) => {
    if (data.code === "CUSTOM") {
      const text = (data.detail || data.note || "").trim();
      if (!text) {
        ctx.addIssue({
          code: "custom",
          path: ["detail"],
          message: "Vlastní upozornění vyžaduje text (detail nebo poznámka).",
        });
      }
    }
  });

export const criticalFlagUpdateSchema = z
  .object({
    status: z.enum(["active", "inactive"]).optional(),
    severity: z.enum(["critical", "high", "medium"]).optional(),
    detail: z.string().trim().max(500).optional().or(z.literal("")),
    note: z.string().trim().max(2000).optional().or(z.literal("")),
    validFrom: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.literal(""))
      .or(z.null()),
    validTo: z
      .string()
      .datetime({ offset: true })
      .optional()
      .or(z.literal(""))
      .or(z.null()),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Prázdná aktualizace.",
  });

export type CriticalFlagWriteInput = z.infer<typeof criticalFlagWriteSchema>;
export type CriticalFlagUpdateInput = z.infer<typeof criticalFlagUpdateSchema>;
