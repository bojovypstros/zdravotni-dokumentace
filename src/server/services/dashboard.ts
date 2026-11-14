/**
 * Phase 6 dashboard aggregate — latest values, med summary, recent events, trends.
 * No health / risk score.
 */

import { prisma } from "@/lib/db/prisma";
import { formatObservationValue } from "@/lib/observation/format";
import { listAllergies } from "@/server/services/allergy";
import { listMedicationAdministrations } from "@/server/services/medication-administration";
import { listMedicationOrders } from "@/server/services/medication-order";
import {
  listObservations,
  serializeObservation,
} from "@/server/services/observation";
import { listDefinitionsForPatient } from "@/server/services/observation-definition";
import { serializePatient } from "@/server/services/patient";
import { listTimelineEvents } from "@/server/services/timeline";

export type DashboardTrendRange = "7d" | "30d" | "90d";

export type DashboardTrendSeries = {
  definitionId: string;
  definitionKey: string;
  definitionLabel: string;
  unit: string;
  supportsPair: boolean;
  displayPrecision: number;
  points: Array<{
    occurredAt: string;
    value?: number;
    secondary?: number;
    label: string;
  }>;
};

function rangeStart(range: DashboardTrendRange): Date {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

const DEFAULT_TREND_KEYS = [
  "blood_pressure",
  "heart_rate",
  "body_temperature",
  "weight",
  "spo2",
];

export async function getDashboard(opts: {
  patientId: string;
  trendRange?: DashboardTrendRange;
  recentLimit?: number;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.patientId },
  });
  if (!patient) return null;

  const trendRange: DashboardTrendRange = opts.trendRange ?? "30d";
  const from = rangeStart(trendRange);
  const recentLimit = opts.recentLimit ?? 12;

  const [
    definitions,
    allergies,
    activeOrders,
    recentAdmins,
    allObservations,
    trendObservations,
    timeline,
  ] = await Promise.all([
    listDefinitionsForPatient(opts.patientId),
    listAllergies(opts.patientId),
    listMedicationOrders({ patientId: opts.patientId, status: "active" }),
    listMedicationAdministrations({
      patientId: opts.patientId,
      limit: 8,
    }),
    listObservations({ patientId: opts.patientId, limit: 400 }),
    listObservations({
      patientId: opts.patientId,
      from,
      limit: 800,
    }),
    listTimelineEvents({
      patientId: opts.patientId,
      limit: recentLimit,
      groupByDay: false,
      timeZone: patient.timezone,
    }),
  ]);

  // Latest value per definition (observations already desc by occurredAt).
  const latestByDefinitionId = new Map<
    string,
    ReturnType<typeof serializeObservation>
  >();
  for (const obs of allObservations) {
    if (!latestByDefinitionId.has(obs.definitionId)) {
      latestByDefinitionId.set(obs.definitionId, obs);
    }
  }

  const latestValues = definitions
    .filter(
      (d) =>
        d.category === "vital_sign" ||
        d.category === "body_measurement" ||
        d.category === "laboratory",
    )
    .map((d) => {
      const obs = latestByDefinitionId.get(d.id) ?? null;
      return {
        definitionId: d.id,
        definitionKey: d.key,
        definitionLabel: d.label,
        category: d.category,
        unit: d.canonicalUnit,
        supportsPair: d.supportsPair,
        displayPrecision: d.displayPrecision,
        observation: obs,
        formatted: obs ? formatObservationValue(obs) : null,
        occurredAt: obs?.occurredAt ?? null,
      };
    })
    .filter((row) => row.observation != null || row.category !== "laboratory");

  // Prefer vitals with data for trends; fall back to default keys.
  const withDataKeys = DEFAULT_TREND_KEYS.filter((key) =>
    trendObservations.some((o) => o.definitionKey === key),
  );
  const trendKeys =
    withDataKeys.length > 0 ? withDataKeys.slice(0, 3) : DEFAULT_TREND_KEYS.slice(0, 3);

  const trends: DashboardTrendSeries[] = [];
  for (const key of trendKeys) {
    const def = definitions.find((d) => d.key === key);
    if (!def) continue;
    const rows = trendObservations
      .filter((o) => o.definitionId === def.id)
      .slice()
      .sort(
        (a, b) =>
          new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
      );
    trends.push({
      definitionId: def.id,
      definitionKey: def.key,
      definitionLabel: def.label,
      unit: def.canonicalUnit ?? rows[0]?.unit ?? "",
      supportsPair: def.supportsPair,
      displayPrecision: def.displayPrecision,
      points: rows.map((o) => ({
        occurredAt: o.occurredAt,
        value: o.numericValue ?? undefined,
        secondary: o.secondaryNumericValue ?? undefined,
        label: formatObservationValue(o),
      })),
    });
  }

  const activeAllergies = allergies.filter((a) => a.status === "active");

  return {
    patient: serializePatient(patient),
    allergyBanner: {
      active: activeAllergies,
      noKnownAllergies: patient.noKnownAllergies,
      hasActive: activeAllergies.length > 0,
      /** True when neither NKA nor any allergy is recorded. */
      statusUnknown: !patient.noKnownAllergies && allergies.length === 0,
    },
    latestValues,
    activeMedications: activeOrders,
    recentAdministrations: recentAdmins,
    recentEvents: timeline.events,
    trends,
    trendRange,
    definitions,
    labDefinitions: definitions.filter((d) => d.category === "laboratory"),
    vitalDefinitions: definitions.filter(
      (d) =>
        d.category === "vital_sign" || d.category === "body_measurement",
    ),
  };
}

export type DashboardPayload = NonNullable<
  Awaited<ReturnType<typeof getDashboard>>
>;
