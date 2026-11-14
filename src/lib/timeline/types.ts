/** Shared timeline DTO types (client + server). */

export type TimelineEventType = "observation";

export type TimelineEvent = {
  id: string;
  type: TimelineEventType;
  patientId: string;
  entityType: "Observation";
  entityId: string;
  occurredAt: string;
  recordedAt: string;
  title: string;
  summary: string;
  meta?: Record<string, unknown>;
};
