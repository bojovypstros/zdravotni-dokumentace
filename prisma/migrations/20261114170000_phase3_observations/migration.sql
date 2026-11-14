-- CreateEnum
CREATE TYPE "ObservationCategory" AS ENUM ('vital_sign', 'laboratory', 'body_measurement', 'symptom_score', 'custom');

-- CreateEnum
CREATE TYPE "ObservationValueType" AS ENUM ('quantity', 'integer', 'decimal', 'boolean', 'text', 'ratio');

-- CreateEnum
CREATE TYPE "ObservationSource" AS ENUM ('manual', 'device_import', 'document_import');

-- CreateTable
CREATE TABLE "observation_definitions" (
    "id" UUID NOT NULL,
    "patientId" UUID,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "ObservationCategory" NOT NULL,
    "valueType" "ObservationValueType" NOT NULL,
    "canonicalUnit" TEXT,
    "allowedUnits" JSONB,
    "displayPrecision" INTEGER NOT NULL DEFAULT 0,
    "lowerReference" DECIMAL(12,4),
    "upperReference" DECIMAL(12,4),
    "supportsPair" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "observation_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "numericValue" DECIMAL(14,4),
    "secondaryNumericValue" DECIMAL(14,4),
    "textValue" TEXT,
    "unit" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" TEXT,
    "bodySite" TEXT,
    "context" TEXT,
    "source" "ObservationSource" NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "observation_definitions_patientId_isActive_idx" ON "observation_definitions"("patientId", "isActive");

-- CreateIndex
CREATE INDEX "observation_definitions_key_idx" ON "observation_definitions"("key");

-- System catalog keys must be unique when patientId is null
CREATE UNIQUE INDEX "observation_definitions_system_key_uidx"
  ON "observation_definitions"("key")
  WHERE "patientId" IS NULL;

-- Custom definitions unique per patient
CREATE UNIQUE INDEX "observation_definitions_patient_key_uidx"
  ON "observation_definitions"("patientId", "key")
  WHERE "patientId" IS NOT NULL;

-- CreateIndex
CREATE INDEX "observations_patientId_occurredAt_idx" ON "observations"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "observations_patientId_definitionId_occurredAt_idx" ON "observations"("patientId", "definitionId", "occurredAt");

-- AddForeignKey
ALTER TABLE "observation_definitions" ADD CONSTRAINT "observation_definitions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "observation_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
