/**
 * Seed script – fictional / operational data only.
 * Never seed real personal or clinical records.
 * Phase 3: system ObservationDefinition catalog (+ optional fictional vitals
 * only when a patient already exists from setup — never invent a real person).
 */
import { PrismaClient } from "@prisma/client";

import {
  SYSTEM_OBSERVATION_DEFINITIONS,
  systemDefinitionCreateData,
} from "../src/server/services/observation-catalog";

const prisma = new PrismaClient();

async function ensureSystemDefinitions() {
  for (const def of SYSTEM_OBSERVATION_DEFINITIONS) {
    const existing = await prisma.observationDefinition.findFirst({
      where: { key: def.key, patientId: null, isSystem: true },
    });
    if (existing) continue;
    await prisma.observationDefinition.create({
      data: systemDefinitionCreateData(def),
    });
  }
}

async function seedFictionalVitalsIfPatientExists() {
  const patient = await prisma.patient.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!patient) return;

  const marker = await prisma.appMeta.findUnique({
    where: { key: "seed.phase3.vitals" },
  });
  if (marker) return;

  const byKey = async (key: string) => {
    const def = await prisma.observationDefinition.findFirst({
      where: { key, patientId: null, isSystem: true },
    });
    if (!def) throw new Error(`Missing system definition ${key}`);
    return def;
  };

  const bp = await byKey("blood_pressure");
  const hr = await byKey("heart_rate");
  const temp = await byKey("body_temperature");
  const spo2 = await byKey("spo2");

  // Fictional demo points spaced in time — not interpolated in charts.
  const base = new Date();
  const hoursAgo = (h: number) => new Date(base.getTime() - h * 60 * 60 * 1000);

  await prisma.observation.createMany({
    data: [
      {
        patientId: patient.id,
        definitionId: bp.id,
        numericValue: 122,
        secondaryNumericValue: 78,
        unit: "mmHg",
        occurredAt: hoursAgo(50),
        context: "v klidu",
        source: "manual",
        notes: "fiktivní seed",
      },
      {
        patientId: patient.id,
        definitionId: bp.id,
        numericValue: 118,
        secondaryNumericValue: 76,
        unit: "mmHg",
        occurredAt: hoursAgo(26),
        context: "ráno",
        source: "manual",
      },
      {
        patientId: patient.id,
        definitionId: hr.id,
        numericValue: 68,
        unit: "/min",
        occurredAt: hoursAgo(50),
        source: "manual",
      },
      {
        patientId: patient.id,
        definitionId: hr.id,
        numericValue: 72,
        unit: "/min",
        occurredAt: hoursAgo(26),
        source: "manual",
      },
      {
        patientId: patient.id,
        definitionId: temp.id,
        numericValue: 36.6,
        unit: "°C",
        occurredAt: hoursAgo(20),
        source: "manual",
      },
      {
        patientId: patient.id,
        definitionId: spo2.id,
        numericValue: 98,
        unit: "%",
        occurredAt: hoursAgo(20),
        source: "manual",
      },
    ],
  });

  await prisma.appMeta.upsert({
    where: { key: "seed.phase3.vitals" },
    create: { key: "seed.phase3.vitals", value: "fictional-phase3" },
    update: { value: "fictional-phase3" },
  });
}

async function main() {
  await prisma.appMeta.upsert({
    where: { key: "seed.marker" },
    create: {
      key: "seed.marker",
      value: "fictional-phase3-bootstrap",
    },
    update: {
      value: "fictional-phase3-bootstrap",
    },
  });

  await ensureSystemDefinitions();
  await seedFictionalVitalsIfPatientExists();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : "unknown");
    await prisma.$disconnect();
    process.exit(1);
  });
