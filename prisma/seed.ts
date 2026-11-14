/**
 * Seed script – fictional / operational data only.
 * Never seed real personal or clinical records.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.appMeta.upsert({
    where: { key: "seed.marker" },
    create: {
      key: "seed.marker",
      value: "fictional-phase1-bootstrap",
    },
    update: {
      value: "fictional-phase1-bootstrap",
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
