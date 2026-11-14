import { z } from "zod";

import { wallClockSchema } from "@/lib/validation/observation";

export const medicationRegimenSchema = z.enum([
  "scheduled",
  "prn",
  "once",
  "course",
  "other",
]);

export const medicationOrderStatusSchema = z.enum([
  "draft",
  "active",
  "paused",
  "completed",
  "discontinued",
  "cancelled",
]);

export const medicationSourceTypeSchema = z.enum([
  "clinician_order",
  "patient_recorded_plan",
  "historical",
  "other",
]);

export const medicationRouteSchema = z.enum([
  "oral",
  "sublingual",
  "topical",
  "inhalation",
  "injection",
  "infusion",
  "ophthalmic",
  "otic",
  "rectal",
  "other",
]);

export const medicationAdministrationStatusSchema = z.enum([
  "taken",
  "partially_taken",
  "refused",
  "omitted",
  "delayed",
  "unknown",
]);

const optionalString = z.string().trim().max(500).optional().or(z.literal(""));
const optionalNotes = z.string().trim().max(2000).optional().or(z.literal(""));

export const medicationOrderWriteSchema = z.object({
  patientId: z.string().uuid(),
  medicationName: z.string().trim().min(1).max(200),
  activeIngredient: optionalString,
  strengthValue: z.number().finite().optional().nullable(),
  strengthUnit: optionalString,
  form: optionalString,
  doseValue: z.number().finite().positive(),
  doseUnit: z.string().trim().min(1).max(40),
  route: medicationRouteSchema,
  regimen: medicationRegimenSchema.default("scheduled"),
  frequencyText: optionalString,
  scheduledTimes: z.array(z.string().trim().min(1).max(16)).max(24).optional().nullable(),
  instructions: optionalNotes,
  indication: optionalString,
  /** Wall clock in patient TZ for start. */
  startAtLocal: wallClockSchema,
  endAtLocal: wallClockSchema.optional().or(z.literal("")),
  status: medicationOrderStatusSchema.default("active"),
  sourceType: medicationSourceTypeSchema.default("patient_recorded_plan"),
  sourceLabel: optionalString,
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type MedicationOrderWriteInput = z.infer<
  typeof medicationOrderWriteSchema
>;

export const medicationAdministrationWriteSchema = z.object({
  patientId: z.string().uuid(),
  medicationOrderId: z.string().uuid().optional().nullable().or(z.literal("")),
  /** Required for one-off; optional when orderId set (defaults from order). */
  medicationNameSnapshot: z.string().trim().min(1).max(200).optional(),
  doseValue: z.number().finite().positive().optional(),
  doseUnit: z.string().trim().min(1).max(40).optional(),
  routeSnapshot: medicationRouteSchema.optional(),
  status: medicationAdministrationStatusSchema,
  occurredAtLocal: wallClockSchema,
  reason: optionalString,
  notes: optionalNotes,
  /** Client-generated unique key; retries with same key return existing. */
  idempotencyKey: z.string().trim().min(8).max(120),
  /** When set on PATCH, audit action becomes correction. */
  correctionReason: z.string().trim().max(500).optional().or(z.literal("")),
});

export type MedicationAdministrationWriteInput = z.infer<
  typeof medicationAdministrationWriteSchema
>;
