import { connection } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

/**
 * Liveness / readiness style health check.
 * Never returns connection strings or credentials.
 */
export async function GET() {
  await connection();
  const started = Date.now();

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "up",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "degraded",
        database: "down",
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
