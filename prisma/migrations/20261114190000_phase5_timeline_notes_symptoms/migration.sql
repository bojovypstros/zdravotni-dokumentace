-- Phase 5: ClinicalNote, SymptomEntry, diary scales + readings

CREATE TYPE "ClinicalNoteType" AS ENUM ('DIARY', 'VISIT_SUMMARY', 'MEDICATION_NOTE', 'RESULT_NOTE', 'CARE_NOTE', 'OTHER');

CREATE TYPE "ClinicalNoteSource" AS ENUM ('manual', 'import', 'other');

CREATE TABLE "clinical_notes" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "noteType" "ClinicalNoteType" NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "ClinicalNoteSource" NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "clinical_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "symptom_entries" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "symptom" TEXT NOT NULL,
    "intensity" DECIMAL(5,2),
    "intensityScale" TEXT,
    "location" TEXT,
    "character" TEXT,
    "onsetAt" TIMESTAMPTZ(3),
    "endedAt" TIMESTAMPTZ(3),
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "context" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "symptom_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "diary_scale_definitions" (
    "id" UUID NOT NULL,
    "patientId" UUID,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minValue" INTEGER NOT NULL DEFAULT 0,
    "maxValue" INTEGER NOT NULL DEFAULT 10,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diary_scale_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "diary_scale_settings" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "definitionId" UUID NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "minValue" INTEGER,
    "maxValue" INTEGER,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diary_scale_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "diary_scale_readings" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "values" JSONB NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diary_scale_readings_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clinical_notes_patientId_occurredAt_idx" ON "clinical_notes"("patientId", "occurredAt");
CREATE INDEX "clinical_notes_patientId_noteType_idx" ON "clinical_notes"("patientId", "noteType");

CREATE INDEX "symptom_entries_patientId_occurredAt_idx" ON "symptom_entries"("patientId", "occurredAt");

CREATE INDEX "diary_scale_definitions_patientId_isActive_idx" ON "diary_scale_definitions"("patientId", "isActive");
CREATE INDEX "diary_scale_definitions_key_idx" ON "diary_scale_definitions"("key");

CREATE UNIQUE INDEX "diary_scale_settings_patientId_definitionId_key" ON "diary_scale_settings"("patientId", "definitionId");
CREATE INDEX "diary_scale_settings_patientId_idx" ON "diary_scale_settings"("patientId");

CREATE INDEX "diary_scale_readings_patientId_occurredAt_idx" ON "diary_scale_readings"("patientId", "occurredAt");

ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "symptom_entries" ADD CONSTRAINT "symptom_entries_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "diary_scale_definitions" ADD CONSTRAINT "diary_scale_definitions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diary_scale_settings" ADD CONSTRAINT "diary_scale_settings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diary_scale_settings" ADD CONSTRAINT "diary_scale_settings_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "diary_scale_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "diary_scale_readings" ADD CONSTRAINT "diary_scale_readings_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
