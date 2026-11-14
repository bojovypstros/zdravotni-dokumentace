/**
 * Timeline hook (Phase 3–4).
 * Maps clinical entities into a unified event list.
 * Phase 3: Observations; Phase 4: MedicationAdministrations.
 * Phase 5 will extend further. No interpolation — persisted rows only.
 */

import { prisma } from "@/lib/db/prisma";
import { formatObservationValue } from "@/lib/observation/format";
import type {
  TimelineEvent,
  TimelineEventType,
} from "@/lib/timeline/types";
import {
  formatAdministrationSummary,
  serializeMedicationAdministration,
} from "@/server/services/medication-administration";
import { serializeObservation } from "@/server/services/observation";

export type { TimelineEvent, TimelineEventType };

export type ListTimelineOptions = {
  patientId: string;
  from?: Date;
  to?: Date;
  types?: TimelineEventType[];
  limit?: number;
  offset?: number;
};

/** Map a serialized observation into a timeline event. */
export function observationToTimelineEvent(
  obs: ReturnType<typeof serializeObservation>,
): TimelineEvent {
  return {
    id: `observation:${obs.id}`,
    type: "observation",
    patientId: obs.patientId,
    entityType: "Observation",
    entityId: obs.id,
    occurredAt: obs.occurredAt,
    recordedAt: obs.recordedAt,
    title: obs.definitionLabel,
    summary: formatObservationValue(obs),
    meta: {
      definitionKey: obs.definitionKey,
      unit: obs.unit,
      source: obs.source,
      context: obs.context,
    },
  };
}

export function medicationAdministrationToTimelineEvent(
  admin: ReturnType<typeof serializeMedicationAdministration>,
): TimelineEvent {
  return {
    id: `medication_administration:${admin.id}`,
    type: "medication_administration",
    patientId: admin.patientId,
    entityType: "MedicationAdministration",
    entityId: admin.id,
    occurredAt: admin.occurredAt,
    recordedAt: admin.recordedAt,
    title: admin.medicationNameSnapshot,
    summary: formatAdministrationSummary(admin),
    meta: {
      status: admin.status,
      doseValue: admin.doseValue,
      doseUnit: admin.doseUnit,
      routeSnapshot: admin.routeSnapshot,
      medicationOrderId: admin.medicationOrderId,
    },
  };
}

export async function listObservationTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.observation.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.from || opts.to
        ? {
            occurredAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    include: { definition: true },
    orderBy: { occurredAt: "desc" },
    take: opts.limit ?? 100,
    skip: opts.offset ?? 0,
  });

  return rows.map((row) =>
    observationToTimelineEvent(serializeObservation(row)),
  );
}

export async function listMedicationAdministrationTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.medicationAdministration.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.from || opts.to
        ? {
            occurredAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { occurredAt: "desc" },
    take: opts.limit ?? 100,
    skip: opts.offset ?? 0,
  });

  return rows.map((row) =>
    medicationAdministrationToTimelineEvent(
      serializeMedicationAdministration(row),
    ),
  );
}

/**
 * Unified timeline query.
 * Later phases append notes/symptoms without rewriting callers.
 */
export async function listTimelineEvents(
  opts: ListTimelineOptions,
): Promise<{ events: TimelineEvent[]; nextOffset: number | null }> {
  const types = opts.types ?? [
    "observation",
    "medication_administration",
  ];
  const events: TimelineEvent[] = [];

  if (types.includes("observation")) {
    events.push(...(await listObservationTimelineEvents(opts)));
  }
  if (types.includes("medication_administration")) {
    events.push(...(await listMedicationAdministrationTimelineEvents(opts)));
  }

  events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const limit = opts.limit ?? 100;
  const sliced = events.slice(0, limit);
  const nextOffset =
    events.length > limit ? (opts.offset ?? 0) + limit : null;

  return { events: sliced, nextOffset };
}
