import { z } from "zod";

export const phoneUseSchema = z.enum(["mobile", "home", "work", "other"]);
export const addressFormSchema = z.enum([
  "formal_surname",
  "formal_title",
  "given_name",
  "preferred_name",
  "neutral",
  "custom",
  "en_mr_ms",
  "en_first",
]);
export const addressGenderSchema = z.enum(["male", "female", "neutral"]);
export const sexAtBirthSchema = z.enum([
  "female",
  "male",
  "intersex",
  "unknown",
  "prefer_not_to_say",
]);

const optionalString = z.string().trim().max(200).optional().or(z.literal(""));
const optionalEmail = z
  .string()
  .trim()
  .email("Neplatný e-mail.")
  .max(200)
  .optional()
  .or(z.literal(""));

export const patientWriteSchema = z
  .object({
    displayName: z.string().trim().min(1).max(120),
    givenName: optionalString,
    familyName: optionalString,
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum ve formátu RRRR-MM-DD.")
      .optional()
      .or(z.literal("")),
    sexAtBirth: sexAtBirthSchema.optional().nullable(),
    heightCm: z.coerce.number().positive().max(300).optional().nullable(),
    bloodGroup: optionalString,
    timezone: z.string().trim().min(1).max(64).default("Europe/Prague"),

    phone: optionalString,
    phoneUse: phoneUseSchema.optional().nullable(),
    email: optionalEmail,
    addressLine: optionalString,
    addressCity: optionalString,
    addressPostalCode: optionalString,
    addressCountry: optionalString,
    emergencyContactName: optionalString,
    emergencyContactRelationship: optionalString,
    emergencyContactPhone: optionalString,
    emergencyContactEmail: optionalEmail,
    contactNote: z.string().trim().max(1000).optional().or(z.literal("")),

    preferredName: optionalString,
    addressForm: addressFormSchema.default("preferred_name"),
    titlePrefix: optionalString,
    titleSuffix: optionalString,
    salutationOverride: z.string().trim().max(200).optional().or(z.literal("")),
    addressGender: addressGenderSchema.optional().nullable(),

    defaultWeightKg: z.coerce.number().positive().max(500).optional().nullable(),
    noKnownAllergies: z.boolean().default(false),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.addressForm === "custom" && !data.salutationOverride) {
      ctx.addIssue({
        code: "custom",
        path: ["salutationOverride"],
        message: "Vlastní oslovení vyžaduje text salutationOverride.",
      });
    }
  });

export type PatientWriteInput = z.infer<typeof patientWriteSchema>;
