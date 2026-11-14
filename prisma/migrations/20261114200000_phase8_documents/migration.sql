-- Phase 8: Document storage for backup/export (no Documents nav agenda).

CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentDate" DATE,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceLabel" TEXT,
    "notes" TEXT,
    "checksum" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documents_storageKey_key" ON "documents"("storageKey");

CREATE INDEX "documents_patientId_uploadedAt_idx" ON "documents"("patientId", "uploadedAt");

ALTER TABLE "documents" ADD CONSTRAINT "documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
