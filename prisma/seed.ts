/**
 * Seed script – fictional / operational data only.
 * Never seed real personal or clinical records.
 * Phase 2: does not create admin user (first-run wizard owns that).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.appMeta.upsert({
    where: { key: "seed.marker" },
    create: {
      key: "seed.marker",
      value: "fictional-phase2-bootstrap",
    },
    update: {
      value: "fictional-phase2-bootstrap",
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error instanceof Error ? error.message : "unknown");
    await prisma.$disconnect();
    process.exit(1);
  });
