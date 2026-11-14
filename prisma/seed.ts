/**
 * Seed script – fictional / operational data only.
 * Never seed real personal or clinical records.
 * Phase 3: system ObservationDefinition catalog (+ optional fictional vitals).
 * Phase 4: optional fictional medication order + administrations (if patient exists).
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

async function seedFictionalMedicationsIfPatientExists() {
  const patient = await prisma.patient.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!patient) return;

  const marker = await prisma.appMeta.findUnique({
    where: { key: "seed.phase4.medications" },
  });
  if (marker) return;

  const startAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const order = await prisma.medicationOrder.create({
    data: {
      patientId: patient.id,
      medicationName: "Fiktivní Paralen 500",
      activeIngredient: "paracetamol",
      strengthValue: 500,
      strengthUnit: "mg",
      form: "tableta",
      doseValue: 1,
      doseUnit: "tbl",
      route: "oral",
      regimen: "prn",
      frequencyText: "dle potřeby, max 3× denně",
      instructions: "fiktivní seed — ne reálný předpis",
      indication: "bolest hlavy (demo)",
      startAt,
      status: "active",
      sourceType: "patient_recorded_plan",
      sourceLabel: "seed phase4",
    },
  });

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  // Explicit administrations only — creating the order does NOT auto-create taken.
  await prisma.medicationAdministration.createMany({
    data: [
      {
        patientId: patient.id,
        medicationOrderId: order.id,
        medicationNameSnapshot: order.medicationName,
        doseValue: 1,
        doseUnit: "tbl",
        routeSnapshot: "oral",
        status: "taken",
        occurredAt: hoursAgo(30),
        notes: "fiktivní seed",
        idempotencyKey: "seed-phase4-admin-taken-1",
      },
      {
        patientId: patient.id,
        medicationOrderId: order.id,
        medicationNameSnapshot: order.medicationName,
        doseValue: 1,
        doseUnit: "tbl",
        routeSnapshot: "oral",
        status: "omitted",
        occurredAt: hoursAgo(10),
        reason: "zapomenuto (demo)",
        idempotencyKey: "seed-phase4-admin-omitted-1",
      },
    ],
  });

  await prisma.appMeta.upsert({
    where: { key: "seed.phase4.medications" },
    create: { key: "seed.phase4.medications", value: "fictional-phase4" },
    update: { value: "fictional-phase4" },
  });
}

async function main() {
  await prisma.appMeta.upsert({
    where: { key: "seed.marker" },
    create: {
      key: "seed.marker",
      value: "fictional-phase4-bootstrap",
    },
    update: {
      value: "fictional-phase4-bootstrap",
    },
  });

  await ensureSystemDefinitions();
  await seedFictionalVitalsIfPatientExists();
  await seedFictionalMedicationsIfPatientExists();
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
