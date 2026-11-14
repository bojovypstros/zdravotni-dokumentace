/**
 * Seed script – fictional / operational data only.
 * Never seed real personal or clinical records.
 * Phase 3: system ObservationDefinition catalog (+ optional fictional vitals).
 * Phase 4: optional fictional medication order + administrations (if patient exists).
 * Phase 5: system diary scales + optional fictional symptoms/notes/readings.
 * Phase 9: optional fictional lab panel, fluids, procedure, encounter.
 */
import { PrismaClient } from "@prisma/client";

import {
  SYSTEM_DIARY_SCALES,
  systemDiaryScaleCreateData,
} from "../src/server/services/diary-scale-catalog";
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

async function ensureSystemDiaryScales() {
  for (const seed of SYSTEM_DIARY_SCALES) {
    const existing = await prisma.diaryScaleDefinition.findFirst({
      where: { key: seed.key, patientId: null, isSystem: true },
    });
    if (existing) continue;
    await prisma.diaryScaleDefinition.create({
      data: systemDiaryScaleCreateData(seed),
    });
  }
}

async function seedFictionalPhase5IfPatientExists() {
  const patient = await prisma.patient.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!patient) return;

  const marker = await prisma.appMeta.findUnique({
    where: { key: "seed.phase5.diary" },
  });
  if (marker) return;

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  await prisma.symptomEntry.create({
    data: {
      patientId: patient.id,
      symptom: "Fiktivní bolest hlavy",
      intensity: 4,
      intensityScale: "0-10",
      location: "čelo",
      character: "tlaková",
      occurredAt: hoursAgo(8),
      context: "po obrazovce (demo)",
      notes: "fiktivní seed phase5",
    },
  });

  await prisma.diaryScaleReading.create({
    data: {
      patientId: patient.id,
      values: { mood: 6, anxiety: 3, energy: 5, fatigue: 4 },
      occurredAt: hoursAgo(6),
      notes: "fiktivní deník škál",
    },
  });

  await prisma.clinicalNote.create({
    data: {
      patientId: patient.id,
      noteType: "DIARY",
      title: "Fiktivní deníkový zápis",
      body: "Demo poznámka phase5 — není reálný zdravotní záznam.",
      occurredAt: hoursAgo(5),
      source: "manual",
    },
  });

  await prisma.appMeta.upsert({
    where: { key: "seed.phase5.diary" },
    create: { key: "seed.phase5.diary", value: "fictional-phase5" },
    update: { value: "fictional-phase5" },
  });
}

async function seedFictionalPhase9IfPatientExists() {
  const patient = await prisma.patient.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!patient) return;

  const marker = await prisma.appMeta.findUnique({
    where: { key: "seed.phase9.modules" },
  });
  if (marker) return;

  const hoursAgo = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000);

  await prisma.labPanel.create({
    data: {
      patientId: patient.id,
      title: "Fiktivní krevní obraz (demo)",
      collectedAt: hoursAgo(40),
      resultedAt: hoursAgo(36),
      laboratory: "Demo Lab",
      source: "seed phase9",
      notes: "fiktivní seed — ne reálný nález",
      results: {
        create: [
          {
            analyte: "Hemoglobin",
            valueNumeric: 142,
            unit: "g/L",
            referenceLow: 120,
            referenceHigh: 160,
            flag: "normal",
          },
          {
            analyte: "CRP",
            valueNumeric: 8.2,
            unit: "mg/L",
            referenceLow: 0,
            referenceHigh: 5,
            flag: "high",
          },
        ],
      },
    },
  });

  await prisma.fluidBalanceEntry.createMany({
    data: [
      {
        patientId: patient.id,
        direction: "intake",
        category: "oral",
        amountMl: 250,
        occurredAt: hoursAgo(6),
        notes: "fiktivní seed",
      },
      {
        patientId: patient.id,
        direction: "output",
        category: "urine",
        amountMl: 180,
        occurredAt: hoursAgo(4),
        notes: "fiktivní seed",
      },
    ],
  });

  await prisma.procedure.create({
    data: {
      patientId: patient.id,
      display: "Fiktivní EKG (demo)",
      status: "completed",
      occurredAt: hoursAgo(72),
      performerLabel: "demo ordinace",
      outcome: "bez nálezu (seed)",
      notes: "fiktivní seed phase9",
    },
  });

  await prisma.encounter.create({
    data: {
      patientId: patient.id,
      type: "outpatient",
      title: "Fiktivní ambulantní kontrola",
      startAt: hoursAgo(80),
      endAt: hoursAgo(78),
      status: "completed",
      facilityLabel: "Demo ambulance",
      reason: "kontrola (seed)",
      notes: "fiktivní seed phase9",
    },
  });

  await prisma.appMeta.upsert({
    where: { key: "seed.phase9.modules" },
    create: { key: "seed.phase9.modules", value: "fictional-phase9" },
    update: { value: "fictional-phase9" },
  });
}

async function main() {
  await prisma.appMeta.upsert({
    where: { key: "seed.marker" },
    create: {
      key: "seed.marker",
      value: "fictional-phase9-bootstrap",
    },
    update: {
      value: "fictional-phase9-bootstrap",
    },
  });

  await ensureSystemDefinitions();
  await ensureSystemDiaryScales();
  await seedFictionalVitalsIfPatientExists();
  await seedFictionalMedicationsIfPatientExists();
  await seedFictionalPhase5IfPatientExists();
  await seedFictionalPhase9IfPatientExists();
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
