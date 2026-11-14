-- Critical chart flags (≠ allergies). Research MVP §4.1.

CREATE TYPE "CriticalFlagCode" AS ENUM (
  'FALL_RISK',
  'NPO',
  'ISOLATION',
  'CODE_STATUS',
  'ANTICOAGULATION',
  'RESTRICTED_EXTREMITY',
  'ASPIRATION_RISK',
  'SEIZURE_PRECAUTIONS',
  'LATEX_SENSITIVITY',
  'IMPLANT_DEVICE',
  'PREGNANCY',
  'CUSTOM'
);

CREATE TYPE "CriticalFlagStatus" AS ENUM ('active', 'inactive');

CREATE TYPE "CriticalFlagSeverity" AS ENUM ('critical', 'high', 'medium');

CREATE TABLE "critical_flags" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "code" "CriticalFlagCode" NOT NULL,
    "status" "CriticalFlagStatus" NOT NULL DEFAULT 'active',
    "severity" "CriticalFlagSeverity" NOT NULL,
    "detail" TEXT,
    "note" TEXT,
    "validFrom" TIMESTAMPTZ(3),
    "validTo" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "critical_flags_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "critical_flags_patientId_status_idx" ON "critical_flags"("patientId", "status");
CREATE INDEX "critical_flags_patientId_code_idx" ON "critical_flags"("patientId", "code");

ALTER TABLE "critical_flags" ADD CONSTRAINT "critical_flags_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
