-- Phase 4: MedicationOrder + MedicationAdministration

CREATE TYPE "MedicationRegimen" AS ENUM ('scheduled', 'prn', 'once', 'course', 'other');
CREATE TYPE "MedicationOrderStatus" AS ENUM ('draft', 'active', 'paused', 'completed', 'discontinued', 'cancelled');
CREATE TYPE "MedicationSourceType" AS ENUM ('clinician_order', 'patient_recorded_plan', 'historical', 'other');
CREATE TYPE "MedicationRoute" AS ENUM ('oral', 'sublingual', 'topical', 'inhalation', 'injection', 'infusion', 'ophthalmic', 'otic', 'rectal', 'other');
CREATE TYPE "MedicationAdministrationStatus" AS ENUM ('taken', 'partially_taken', 'refused', 'omitted', 'delayed', 'unknown');

CREATE TABLE "medication_orders" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "medicationName" TEXT NOT NULL,
    "activeIngredient" TEXT,
    "strengthValue" DECIMAL(14,4),
    "strengthUnit" TEXT,
    "form" TEXT,
    "doseValue" DECIMAL(14,4) NOT NULL,
    "doseUnit" TEXT NOT NULL,
    "route" "MedicationRoute" NOT NULL,
    "regimen" "MedicationRegimen" NOT NULL DEFAULT 'scheduled',
    "frequencyText" TEXT,
    "scheduledTimes" JSONB,
    "instructions" TEXT,
    "indication" TEXT,
    "startAt" TIMESTAMPTZ(3) NOT NULL,
    "endAt" TIMESTAMPTZ(3),
    "status" "MedicationOrderStatus" NOT NULL DEFAULT 'active',
    "sourceType" "MedicationSourceType" NOT NULL DEFAULT 'patient_recorded_plan',
    "sourceLabel" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medication_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "medication_administrations" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "medicationOrderId" UUID,
    "medicationNameSnapshot" TEXT NOT NULL,
    "doseValue" DECIMAL(14,4) NOT NULL,
    "doseUnit" TEXT NOT NULL,
    "routeSnapshot" "MedicationRoute" NOT NULL,
    "status" "MedicationAdministrationStatus" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "notes" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "medication_orders_patientId_status_idx" ON "medication_orders"("patientId", "status");
CREATE INDEX "medication_orders_patientId_startAt_idx" ON "medication_orders"("patientId", "startAt");
CREATE INDEX "medication_administrations_patientId_occurredAt_idx" ON "medication_administrations"("patientId", "occurredAt");
CREATE INDEX "medication_administrations_medicationOrderId_occurredAt_idx" ON "medication_administrations"("medicationOrderId", "occurredAt");
CREATE UNIQUE INDEX "medication_administrations_idempotencyKey_key" ON "medication_administrations"("idempotencyKey");

ALTER TABLE "medication_orders" ADD CONSTRAINT "medication_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medication_administrations" ADD CONSTRAINT "medication_administrations_medicationOrderId_fkey" FOREIGN KEY ("medicationOrderId") REFERENCES "medication_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
