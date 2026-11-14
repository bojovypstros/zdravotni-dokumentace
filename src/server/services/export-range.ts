import { fromZonedTime } from "date-fns-tz";

import { DEFAULT_TIMEZONE } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import type { ExportRange } from "@/server/services/export";

export async function resolveExportRange(opts: {
  patientId: string;
  from?: string;
  to?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<ExportRange> {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.patientId },
  });
  const tz = patient?.timezone ?? DEFAULT_TIMEZONE;

  let from: Date | null = null;
  let to: Date | null = null;

  if (opts.from) {
    from = new Date(opts.from);
    if (Number.isNaN(from.getTime())) throw new Error("Neplatný parametr from.");
  } else if (opts.fromDate) {
    from = fromZonedTime(`${opts.fromDate}T00:00:00`, tz);
  }

  if (opts.to) {
    to = new Date(opts.to);
    if (Number.isNaN(to.getTime())) throw new Error("Neplatný parametr to.");
  } else if (opts.toDate) {
    // Inclusive end of day in patient TZ
    to = fromZonedTime(`${opts.toDate}T23:59:59.999`, tz);
  }

  return { from, to };
}
