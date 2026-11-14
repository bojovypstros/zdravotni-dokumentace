import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

export const fluidDirectionSchema = z.enum(["intake", "output"]);

const optionalNotes = z.string().trim().max(2000).optional().or(z.literal(""));

export const fluidBalanceWriteSchema = z.object({
  patientId: z.string().uuid(),
  direction: fluidDirectionSchema,
  category: z.string().trim().min(1).max(120),
  amountMl: z.coerce.number().positive().max(100_000),
  occurredAtLocal: wallClockSchema,
  notes: optionalNotes,
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type FluidBalanceWriteInput = z.infer<typeof fluidBalanceWriteSchema>;
