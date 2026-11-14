/**
 * Unified timeline (Phase 5 + Phase 9 modules).
 * Maps clinical entities into one event list — each persisted row once.
 * Filters, day grouping, pagination. No interpolation.
 */

import { formatInTimeZone } from "date-fns-tz";

import { DEFAULT_TIMEZONE } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import { formatObservationValue } from "@/lib/observation/format";
import {
  ALL_TIMELINE_EVENT_TYPES,
  type TimelineDayGroup,
  type TimelineEvent,
  type TimelineEventType,
} from "@/lib/timeline/types";
import {
  clinicalNoteTitle,
  formatClinicalNoteSummary,
  serializeClinicalNote,
} from "@/server/services/clinical-note";
import {
  formatDiaryScaleSummary,
  serializeDiaryScaleReading,
} from "@/server/services/diary-scale";
import {
  formatEncounterSummary,
  serializeEncounter,
} from "@/server/services/encounter";
import {
  formatFluidSummary,
  serializeFluidBalanceEntry,
} from "@/server/services/fluid";
import {
  formatLabPanelSummary,
  serializeLabPanel,
} from "@/server/services/lab";
import {
  formatAdministrationSummary,
  serializeMedicationAdministration,
} from "@/server/services/medication-administration";
import { serializeObservation } from "@/server/services/observation";
import {
  formatProcedureSummary,
  serializeProcedure,
} from "@/server/services/procedure";
import {
  formatSymptomSummary,
  serializeSymptomEntry,
} from "@/server/services/symptom";

export type { TimelineDayGroup, TimelineEvent, TimelineEventType };
export { ALL_TIMELINE_EVENT_TYPES };

export type ListTimelineOptions = {
  patientId: string;
  from?: Date;
  to?: Date;
  types?: TimelineEventType[];
  limit?: number;
  offset?: number;
  /** When true, also return events grouped by calendar day in patient TZ. */
  groupByDay?: boolean;
  timeZone?: string;
};

function occurredAtFilter(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  return {
    occurredAt: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    },
  };
}

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

export function clinicalNoteToTimelineEvent(
  note: ReturnType<typeof serializeClinicalNote>,
): TimelineEvent {
  return {
    id: `clinical_note:${note.id}`,
    type: "clinical_note",
    patientId: note.patientId,
    entityType: "ClinicalNote",
    entityId: note.id,
    occurredAt: note.occurredAt,
    recordedAt: note.recordedAt,
    title: clinicalNoteTitle(note),
    summary: formatClinicalNoteSummary(note),
    meta: {
      noteType: note.noteType,
      source: note.source,
    },
  };
}

export function symptomToTimelineEvent(
  symptom: ReturnType<typeof serializeSymptomEntry>,
): TimelineEvent {
  return {
    id: `symptom:${symptom.id}`,
    type: "symptom",
    patientId: symptom.patientId,
    entityType: "SymptomEntry",
    entityId: symptom.id,
    occurredAt: symptom.occurredAt,
    recordedAt: symptom.recordedAt,
    title: symptom.symptom,
    summary: formatSymptomSummary(symptom),
    meta: {
      intensity: symptom.intensity,
      intensityScale: symptom.intensityScale,
      location: symptom.location,
      character: symptom.character,
      context: symptom.context,
    },
  };
}

export function diaryScaleToTimelineEvent(
  reading: ReturnType<typeof serializeDiaryScaleReading>,
): TimelineEvent {
  return {
    id: `diary_scale:${reading.id}`,
    type: "diary_scale",
    patientId: reading.patientId,
    entityType: "DiaryScaleReading",
    entityId: reading.id,
    occurredAt: reading.occurredAt,
    recordedAt: reading.recordedAt,
    title: "Deník škál",
    summary: formatDiaryScaleSummary(reading),
    meta: {
      values: reading.values,
      notes: reading.notes,
    },
  };
}

export function labPanelToTimelineEvent(
  panel: ReturnType<typeof serializeLabPanel>,
): TimelineEvent {
  const occurredAt =
    panel.collectedAt ?? panel.resultedAt ?? panel.createdAt;
  return {
    id: `lab_panel:${panel.id}`,
    type: "lab_panel",
    patientId: panel.patientId,
    entityType: "LabPanel",
    entityId: panel.id,
    occurredAt,
    recordedAt: panel.createdAt,
    title: panel.title,
    summary: formatLabPanelSummary(panel),
    meta: {
      laboratory: panel.laboratory,
      source: panel.source,
      resultCount: panel.results.length,
    },
  };
}

export function fluidBalanceToTimelineEvent(
  entry: ReturnType<typeof serializeFluidBalanceEntry>,
): TimelineEvent {
  return {
    id: `fluid_balance:${entry.id}`,
    type: "fluid_balance",
    patientId: entry.patientId,
    entityType: "FluidBalanceEntry",
    entityId: entry.id,
    occurredAt: entry.occurredAt,
    recordedAt: entry.createdAt,
    title: entry.direction === "intake" ? "Příjem tekutin" : "Výdej tekutin",
    summary: formatFluidSummary(entry),
    meta: {
      direction: entry.direction,
      category: entry.category,
      amountMl: entry.amountMl,
    },
  };
}

export function procedureToTimelineEvent(
  procedure: ReturnType<typeof serializeProcedure>,
): TimelineEvent {
  return {
    id: `procedure:${procedure.id}`,
    type: "procedure",
    patientId: procedure.patientId,
    entityType: "Procedure",
    entityId: procedure.id,
    occurredAt: procedure.occurredAt,
    recordedAt: procedure.createdAt,
    title: procedure.display,
    summary: formatProcedureSummary(procedure),
    meta: {
      status: procedure.status,
      performerLabel: procedure.performerLabel,
      outcome: procedure.outcome,
    },
  };
}

export function encounterToTimelineEvent(
  encounter: ReturnType<typeof serializeEncounter>,
): TimelineEvent {
  return {
    id: `encounter:${encounter.id}`,
    type: "encounter",
    patientId: encounter.patientId,
    entityType: "Encounter",
    entityId: encounter.id,
    occurredAt: encounter.startAt,
    recordedAt: encounter.createdAt,
    title: encounter.title,
    summary: formatEncounterSummary(encounter),
    meta: {
      type: encounter.type,
      status: encounter.status,
      endAt: encounter.endAt,
      facilityLabel: encounter.facilityLabel,
    },
  };
}

async function listObservationTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.observation.findMany({
    where: {
      patientId: opts.patientId,
      ...occurredAtFilter(opts.from, opts.to),
    },
    include: { definition: true },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((row) =>
    observationToTimelineEvent(serializeObservation(row)),
  );
}

async function listMedicationAdministrationTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.medicationAdministration.findMany({
    where: {
      patientId: opts.patientId,
      ...occurredAtFilter(opts.from, opts.to),
    },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((row) =>
    medicationAdministrationToTimelineEvent(
      serializeMedicationAdministration(row),
    ),
  );
}

async function listClinicalNoteTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.clinicalNote.findMany({
    where: {
      patientId: opts.patientId,
      ...occurredAtFilter(opts.from, opts.to),
    },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((row) =>
    clinicalNoteToTimelineEvent(serializeClinicalNote(row)),
  );
}

async function listSymptomTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.symptomEntry.findMany({
    where: {
      patientId: opts.patientId,
      ...occurredAtFilter(opts.from, opts.to),
    },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((row) =>
    symptomToTimelineEvent(serializeSymptomEntry(row)),
  );
}

async function listDiaryScaleTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.diaryScaleReading.findMany({
    where: {
      patientId: opts.patientId,
      ...occurredAtFilter(opts.from, opts.to),
    },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((row) =>
    diaryScaleToTimelineEvent(serializeDiaryScaleReading(row)),
  );
}

async function listLabPanelTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.labPanel.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.from || opts.to
        ? {
            OR: [
              {
                collectedAt: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lte: opts.to } : {}),
                },
              },
              {
                collectedAt: null,
                resultedAt: {
                  ...(opts.from ? { gte: opts.from } : {}),
                  ...(opts.to ? { lte: opts.to } : {}),
                },
              },
            ],
          }
        : {}),
    },
    include: { results: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => labPanelToTimelineEvent(serializeLabPanel(row)));
}

async function listFluidBalanceTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.fluidBalanceEntry.findMany({
    where: {
      patientId: opts.patientId,
      ...occurredAtFilter(opts.from, opts.to),
    },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((row) =>
    fluidBalanceToTimelineEvent(serializeFluidBalanceEntry(row)),
  );
}

async function listProcedureTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.procedure.findMany({
    where: {
      patientId: opts.patientId,
      ...occurredAtFilter(opts.from, opts.to),
    },
    orderBy: { occurredAt: "desc" },
  });
  return rows.map((row) => procedureToTimelineEvent(serializeProcedure(row)));
}

async function listEncounterTimelineEvents(
  opts: ListTimelineOptions,
): Promise<TimelineEvent[]> {
  const rows = await prisma.encounter.findMany({
    where: {
      patientId: opts.patientId,
      ...(opts.from || opts.to
        ? {
            startAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
    },
    orderBy: { startAt: "desc" },
  });
  return rows.map((row) => encounterToTimelineEvent(serializeEncounter(row)));
}

function groupEventsByDay(
  events: TimelineEvent[],
  timeZone: string,
): TimelineDayGroup[] {
  const map = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const dateKey = formatInTimeZone(
      new Date(ev.occurredAt),
      timeZone,
      "yyyy-MM-dd",
    );
    const list = map.get(dateKey);
    if (list) list.push(ev);
    else map.set(dateKey, [ev]);
  }
  return [...map.entries()].map(([dateKey, dayEvents]) => ({
    dateKey,
    events: dayEvents,
  }));
}

/**
 * Unified timeline query.
 * Fetch → merge → sort by occurredAt desc → paginate (each entity once).
 */
export async function listTimelineEvents(
  opts: ListTimelineOptions,
): Promise<{
  events: TimelineEvent[];
  nextOffset: number | null;
  total: number;
  groups: TimelineDayGroup[] | null;
}> {
  const types = opts.types?.length
    ? opts.types
    : [...ALL_TIMELINE_EVENT_TYPES];
  const events: TimelineEvent[] = [];

  if (types.includes("observation")) {
    events.push(...(await listObservationTimelineEvents(opts)));
  }
  if (types.includes("medication_administration")) {
    events.push(...(await listMedicationAdministrationTimelineEvents(opts)));
  }
  if (types.includes("clinical_note")) {
    events.push(...(await listClinicalNoteTimelineEvents(opts)));
  }
  if (types.includes("symptom")) {
    events.push(...(await listSymptomTimelineEvents(opts)));
  }
  if (types.includes("diary_scale")) {
    events.push(...(await listDiaryScaleTimelineEvents(opts)));
  }
  if (types.includes("lab_panel")) {
    events.push(...(await listLabPanelTimelineEvents(opts)));
  }
  if (types.includes("fluid_balance")) {
    events.push(...(await listFluidBalanceTimelineEvents(opts)));
  }
  if (types.includes("procedure")) {
    events.push(...(await listProcedureTimelineEvents(opts)));
  }
  if (types.includes("encounter")) {
    events.push(...(await listEncounterTimelineEvents(opts)));
  }

  events.sort(
    (a, b) =>
      new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  // Deduplicate by stable id (should already be unique across entity types).
  const seen = new Set<string>();
  const unique = events.filter((ev) => {
    if (seen.has(ev.id)) return false;
    seen.add(ev.id);
    return true;
  });

  const total = unique.length;
  const limit = opts.limit ?? 100;
  const offset = opts.offset ?? 0;
  const sliced = unique.slice(offset, offset + limit);
  const nextOffset = offset + limit < total ? offset + limit : null;

  let timeZone = opts.timeZone;
  if (!timeZone) {
    const patient = await prisma.patient.findUnique({
      where: { id: opts.patientId },
      select: { timezone: true },
    });
    timeZone = patient?.timezone ?? DEFAULT_TIMEZONE;
  }

  const groups =
    opts.groupByDay === false
      ? null
      : groupEventsByDay(sliced, timeZone);

  return { events: sliced, nextOffset, total, groups };
}
