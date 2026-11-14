/**
 * Timeline hook (Phase 3).
 * Maps clinical entities into a unified event list.
 * Phase 3 contributes Observations only; Phase 5 will extend.
 * No interpolation — only persisted rows, sorted by occurredAt.
 */

import { prisma } from "@/lib/db/prisma";
import { formatObservationValue } from "@/lib/observation/format";
import type {
  TimelineEvent,
  TimelineEventType,
} from "@/lib/timeline/types";
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

/**
 * Unified timeline query (Phase 3 stub: observations only).
 * Later phases append medications, notes, symptoms without rewriting callers.
 */
export async function listTimelineEvents(
  opts: ListTimelineOptions,
): Promise<{ events: TimelineEvent[]; nextOffset: number | null }> {
  const types = opts.types ?? ["observation"];
  const events: TimelineEvent[] = [];

  if (types.includes("observation")) {
    const obsEvents = await listObservationTimelineEvents(opts);
    events.push(...obsEvents);
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
