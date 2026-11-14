/** Shared timeline DTO types (client + server). */

export type TimelineEventType =
  | "observation"
  | "medication_administration"
  | "clinical_note"
  | "symptom"
  | "diary_scale";

export type TimelineEntityType =
  | "Observation"
  | "MedicationAdministration"
  | "ClinicalNote"
  | "SymptomEntry"
  | "DiaryScaleReading";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  patientId: string;
  entityType: TimelineEntityType;
  entityId: string;
  occurredAt: string;
  recordedAt: string;
  title: string;
  summary: string;
  meta?: Record<string, unknown>;
};

export type TimelineDayGroup = {
  /** YYYY-MM-DD in patient timezone */
  dateKey: string;
  events: TimelineEvent[];
};

export const ALL_TIMELINE_EVENT_TYPES: TimelineEventType[] = [
  "observation",
  "medication_administration",
  "clinical_note",
  "symptom",
  "diary_scale",
];
