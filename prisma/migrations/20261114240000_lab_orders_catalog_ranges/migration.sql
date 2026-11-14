-- Lab: orders (žádanky) vs results; app-wide analyte catalog with ADMIN-editable defaults

CREATE TYPE "LabOrderStatus" AS ENUM ('draft', 'ordered', 'partial', 'done', 'cancelled');
CREATE TYPE "LabOrderPriority" AS ENUM ('routine', 'statim');
CREATE TYPE "LabReportStatus" AS ENUM ('preliminary', 'final', 'corrected');

CREATE TABLE "lab_analyte_definitions" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "abbreviation" TEXT,
    "unit" TEXT,
    "panelGroup" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "referenceLow" DECIMAL(14,4),
    "referenceHigh" DECIMAL(14,4),
    "referenceLowFemale" DECIMAL(14,4),
    "referenceHighFemale" DECIMAL(14,4),
    "referenceLowMale" DECIMAL(14,4),
    "referenceHighMale" DECIMAL(14,4),
    "referenceText" TEXT,
    "sourceNote" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lab_analyte_definitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lab_analyte_definitions_key_key" ON "lab_analyte_definitions"("key");
CREATE INDEX "lab_analyte_definitions_panelGroup_sortOrder_idx" ON "lab_analyte_definitions"("panelGroup", "sortOrder");
CREATE INDEX "lab_analyte_definitions_isActive_idx" ON "lab_analyte_definitions"("isActive");

CREATE TABLE "lab_orders" (
    "id" UUID NOT NULL,
    "patientId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'draft',
    "priority" "LabOrderPriority" NOT NULL DEFAULT 'routine',
    "panelGroup" TEXT,
    "orderedAt" TIMESTAMPTZ(3),
    "collectedAt" TIMESTAMPTZ(3),
    "laboratory" TEXT,
    "indication" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lab_orders_patientId_orderedAt_idx" ON "lab_orders"("patientId", "orderedAt");
CREATE INDEX "lab_orders_patientId_status_idx" ON "lab_orders"("patientId", "status");

CREATE TABLE "lab_order_items" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "analyteKey" TEXT,
    "analyteLabel" TEXT NOT NULL,
    "unit" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lab_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lab_order_items_orderId_idx" ON "lab_order_items"("orderId");

ALTER TABLE "lab_panels" ADD COLUMN "orderId" UUID;
ALTER TABLE "lab_panels" ADD COLUMN "reportStatus" "LabReportStatus" NOT NULL DEFAULT 'final';
CREATE INDEX "lab_panels_orderId_idx" ON "lab_panels"("orderId");

ALTER TABLE "lab_results" ADD COLUMN "analyteKey" TEXT;

ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lab_order_items" ADD CONSTRAINT "lab_order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "lab_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lab_panels" ADD CONSTRAINT "lab_panels_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "lab_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
