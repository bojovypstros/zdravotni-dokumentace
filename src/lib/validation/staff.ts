import { z } from "zod";

export const createStaffSchema = z.object({
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
  /** MVP: only DOCTOR creatable by admin; ADMIN remains first-run / explicit. */
  role: z.enum(["DOCTOR", "ADMIN"]).default("DOCTOR"),
});

export const setActivePatientSchema = z.object({
  patientId: z.string().uuid("Neplatné ID pacienta."),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
