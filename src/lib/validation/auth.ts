import { z } from "zod";

/** First-run: ADMIN (vrchní lékař) only — patients are created in kartotéka. */
export const setupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Uživatelské jméno musí mít alespoň 3 znaky.")
    .max(64)
    .regex(/^[a-zA-Z0-9._@+-]+$/, "Nepovolené znaky v uživatelském jméně."),
  password: z
    .string()
    .min(10, "Heslo musí mít alespoň 10 znaků.")
    .max(200),
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(200),
});

export type SetupInput = z.infer<typeof setupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
