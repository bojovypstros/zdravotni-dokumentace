-- Phase 10: clinic / kartotéka mode
-- Safe for existing single-patient data: enum widen + staff flag only.
-- Existing ADMIN users remain ADMIN (vrchní lékař). Patients stay untouched.

-- AlterEnum: add DOCTOR (lékař)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'DOCTOR';

-- Staff accounts can be deactivated without deleting audit history
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
