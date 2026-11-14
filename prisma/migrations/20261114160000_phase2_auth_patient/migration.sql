-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "PhoneUse" AS ENUM ('mobile', 'home', 'work', 'other');

-- CreateEnum
CREATE TYPE "AddressForm" AS ENUM ('formal_surname', 'formal_title', 'given_name', 'preferred_name', 'neutral', 'custom', 'en_mr_ms', 'en_first');

-- CreateEnum
CREATE TYPE "AddressGender" AS ENUM ('male', 'female', 'neutral');

-- CreateEnum
CREATE TYPE "SexAtBirth" AS ENUM ('female', 'male', 'intersex', 'unknown', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "DiagnosisStatus" AS ENUM ('active', 'in_remission', 'resolved', 'unconfirmed', 'historical');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('mild', 'moderate', 'severe', 'unknown');

-- CreateEnum
CREATE TYPE "AllergyStatus" AS ENUM ('active', 'inactive', 'unconfirmed');

-- CreateEnum
CREATE TYPE "AllergyVerification" AS ENUM ('confirmed_by_clinician', 'patient_reported', 'unknown');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('create', 'update', 'correction', 'archive', 'restore', 'export', 'backup', 'login', 'logout', 'setup');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "csrfToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotatedFromId" UUID,
    "userAgentSummary" TEXT,
    "ipHash" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "displayName" TEXT NOT NULL,
    "givenName" TEXT,
    "familyName" TEXT,
    "birthDate" DATE,
    "sexAtBirth" "SexAtBirth",
    "heightCm" DECIMAL(5,2),
    "bloodGroup" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Prague',
    "phone" TEXT,
    "phoneUse" "PhoneUse",
    "email" TEXT,
    "addressLine" TEXT,
    "addressCity" TEXT,
    "addressPostalCode" TEXT,
    "addressCountry" TEXT DEFAULT 'CZ',
    "emergencyContactName" TEXT,
    "emergencyContactRelationship" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactEmail" TEXT,
    "contactNote" TEXT,
    "preferredName" TEXT,
    "addressForm" "AddressForm" NOT NULL DEFAULT 'preferred_name',
    "titlePrefix" TEXT,
    "titleSuffix" TEXT,
    "salutationOverride" TEXT,
    "addressGender" "AddressGender",
    "defaultWeightKg" DECIMAL(6,2),
    "noKnownAllergies" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnoses" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "display" TEXT NOT NULL,
    "codeSystem" TEXT,
    "code" TEXT,
    "status" "DiagnosisStatus" NOT NULL DEFAULT 'active',
    "onsetDate" DATE,
    "resolvedDate" DATE,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "diagnoses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "substance" TEXT NOT NULL,
    "reaction" TEXT,
    "severity" "AllergySeverity" NOT NULL DEFAULT 'unknown',
    "status" "AllergyStatus" NOT NULL DEFAULT 'active',
    "verification" "AllergyVerification" NOT NULL DEFAULT 'patient_reported',
    "onsetDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "patientId" UUID,
    "actorId" UUID,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "changeSummary" TEXT,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "requestId" TEXT,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "patients_isActive_idx" ON "patients"("isActive");

-- CreateIndex
CREATE INDEX "diagnoses_patientId_status_idx" ON "diagnoses"("patientId", "status");

-- CreateIndex
CREATE INDEX "allergies_patientId_status_idx" ON "allergies"("patientId", "status");

-- CreateIndex
CREATE INDEX "audit_events_patientId_occurredAt_idx" ON "audit_events"("patientId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_actorId_occurredAt_idx" ON "audit_events"("actorId", "occurredAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnoses" ADD CONSTRAINT "diagnoses_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

