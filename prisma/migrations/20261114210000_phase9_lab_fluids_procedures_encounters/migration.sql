-- Phase 9: LabPanel/LabResult, FluidBalanceEntry, Procedure, Encounter

CREATE TYPE "EncounterType" AS ENUM ('hospitalization', 'outpatient', 'emergency', 'self_monitoring', 'other');
CREATE TYPE "EncounterStatus" AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');
CREATE TYPE "LabResultFlag" AS ENUM ('low', 'high', 'normal', 'abnormal_unspecified', 'unknown');
CREATE TYPE "FluidDirection" AS ENUM ('intake', 'output');
CREATE TYPE "ProcedureStatus" AS ENUM ('planned', 'completed', 'cancelled', 'unknown');

CREATE TABLE "encounters" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "type" "EncounterType" NOT NULL,
    "title" TEXT NOT NULL,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3),
    "status" "EncounterStatus" NOT NULL DEFAULT 'planned',
    "facilityLabel" TEXT,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_panels" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "collectedAt" TIMESTAMPTZ(3),
    "resultedAt" TIMESTAMPTZ(3),
    "laboratory" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lab_panels_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lab_results" (
    "id" UUID NOT NULL,
    "panelId" UUID NOT NULL,
    "analyte" TEXT NOT NULL,
    "valueNumeric" DECIMAL(14,4),
    "valueText" TEXT,
    "unit" TEXT,
    "referenceLow" DECIMAL(14,4),
    "referenceHigh" DECIMAL(14,4),
    "referenceText" TEXT,
    "flag" "LabResultFlag" NOT NULL DEFAULT 'unknown',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fluid_balance_entries" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "direction" "FluidDirection" NOT NULL,
    "category" TEXT NOT NULL,
    "amountMl" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fluid_balance_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "procedures" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "display" TEXT NOT NULL,
    "status" "ProcedureStatus" NOT NULL DEFAULT 'completed',
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "performerLabel" TEXT,
    "outcome" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "procedures_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "encounters_patientId_startAt_idx" ON "encounters"("patientId", "startAt");
CREATE INDEX "encounters_patientId_status_idx" ON "encounters"("patientId", "status");
CREATE INDEX "lab_panels_patientId_collectedAt_idx" ON "lab_panels"("patientId", "collectedAt");
CREATE INDEX "lab_panels_patientId_resultedAt_idx" ON "lab_panels"("patientId", "resultedAt");
CREATE INDEX "lab_results_panelId_idx" ON "lab_results"("panelId");
CREATE INDEX "fluid_balance_entries_patientId_occurredAt_idx" ON "fluid_balance_entries"("patientId", "occurredAt");
CREATE INDEX "fluid_balance_entries_patientId_direction_occurredAt_idx" ON "fluid_balance_entries"("patientId", "direction", "occurredAt");
CREATE INDEX "procedures_patientId_occurredAt_idx" ON "procedures"("patientId", "occurredAt");
CREATE INDEX "procedures_patientId_status_idx" ON "procedures"("patientId", "status");

ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lab_panels" ADD CONSTRAINT "lab_panels_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lab_results" ADD CONSTRAINT "lab_results_panelId_fkey" FOREIGN KEY ("panelId") REFERENCES "lab_panels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fluid_balance_entries" ADD CONSTRAINT "fluid_balance_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
