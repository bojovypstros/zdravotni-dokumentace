import { z } from "zod";

/** Minimal kartotéka create — full profile editable afterwards. */
export const patientCreateMinimalSchema = z.object({
  displayName: z.string().trim().min(1).max(120),
  preferredName: z.string().trim().max(120).optional().or(z.literal("")),
  givenName: z.string().trim().max(120).optional().or(z.literal("")),
  familyName: z.string().trim().max(120).optional().or(z.literal("")),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ve formátu RRRR-MM-DD.")
    .optional()
    .or(z.literal("")),
  phone: z.string().trim().max(200).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Neplatný e-mail.")
    .max(200)
    .optional()
    .or(z.literal("")),
});

export type PatientCreateMinimalInput = z.infer<
  typeof patientCreateMinimalSchema
>;
