import { z } from "zod";

import { phoneUseSchema } from "@/lib/validation/patient";

/** Kartotéka create wizard payload (subset of Patient; clinical rows posted separately). */
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
  phoneUse: phoneUseSchema.optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Neplatný e-mail.")
    .max(200)
    .optional()
    .or(z.literal("")),
  addressLine: z.string().trim().max(200).optional().or(z.literal("")),
  addressCity: z.string().trim().max(200).optional().or(z.literal("")),
  addressPostalCode: z.string().trim().max(200).optional().or(z.literal("")),
  addressCountry: z.string().trim().max(200).optional().or(z.literal("")),
  emergencyContactName: z.string().trim().max(200).optional().or(z.literal("")),
  emergencyContactRelationship: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("")),
  emergencyContactPhone: z.string().trim().max(200).optional().or(z.literal("")),
  emergencyContactEmail: z
    .string()
    .trim()
    .email("Neplatný e-mail.")
    .max(200)
    .optional()
    .or(z.literal("")),
  contactNote: z.string().trim().max(1000).optional().or(z.literal("")),
  noKnownAllergies: z.boolean().optional(),
});

export type PatientCreateMinimalInput = z.infer<
  typeof patientCreateMinimalSchema
>;
