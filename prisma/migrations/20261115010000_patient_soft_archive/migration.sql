-- Soft archive for patients (kartotéka): nullable archivedAt; no hard delete.
ALTER TABLE "patients" ADD COLUMN "archivedAt" TIMESTAMPTZ(3);

CREATE INDEX "patients_archivedAt_idx" ON "patients"("archivedAt");
