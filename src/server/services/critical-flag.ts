import type {
  CriticalFlag,
  CriticalFlagCode,
  CriticalFlagSeverity,
  Prisma,
} from "@prisma/client";

import {
  CRITICAL_FLAG_DEFAULT_SEVERITY,
  CRITICAL_FLAG_LABELS,
} from "@/lib/critical-flags";
import { prisma } from "@/lib/db/prisma";
import type {
  CriticalFlagUpdateInput,
  CriticalFlagWriteInput,
} from "@/lib/validation/critical-flag";
import { runAuditedMutation } from "@/server/services/audit";

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function dateTimeOrNull(value: string | null | undefined): Date | null {
  const s = emptyToNull(value ?? null);
  return s ? new Date(s) : null;
}

export function serializeCriticalFlag(row: CriticalFlag) {
  return {
    id: row.id,
    patientId: row.patientId,
    code: row.code,
    label: CRITICAL_FLAG_LABELS[row.code],
    status: row.status,
    severity: row.severity,
    detail: row.detail,
    note: row.note,
    validFrom: row.validFrom?.toISOString() ?? null,
    validTo: row.validTo?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type CriticalFlagDto = ReturnType<typeof serializeCriticalFlag>;

/** Active flags for overview: status=active and not past validTo. */
export function isFlagActiveNow(
  flag: Pick<CriticalFlagDto, "status" | "validTo">,
  now = new Date(),
): boolean {
  if (flag.status !== "active") return false;
  if (flag.validTo && new Date(flag.validTo).getTime() < now.getTime()) {
    return false;
  }
  return true;
}

export async function listCriticalFlags(patientId: string) {
  const rows = await prisma.criticalFlag.findMany({
    where: { patientId },
    orderBy: [{ status: "asc" }, { severity: "asc" }, { createdAt: "desc" }],
  });
  return rows.map(serializeCriticalFlag);
}

export async function listActiveCriticalFlagsForOverview(patientId: string) {
  const all = await listCriticalFlags(patientId);
  const active = all.filter((f) => isFlagActiveNow(f));
  const severityRank: Record<CriticalFlagSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
  };
  active.sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      a.label.localeCompare(b.label, "cs"),
  );
  return active;
}

export async function createCriticalFlag(opts: {
  input: CriticalFlagWriteInput;
  actorId: string;
  requestId?: string;
}) {
  const patient = await prisma.patient.findUnique({
    where: { id: opts.input.patientId },
  });
  if (!patient) {
    throw new CriticalFlagServiceError("Pacient nenalezen.", 404);
  }

  const code = opts.input.code as CriticalFlagCode;
  const severity =
    (opts.input.severity as CriticalFlagSeverity | undefined) ??
    CRITICAL_FLAG_DEFAULT_SEVERITY[code];

  const data: Prisma.CriticalFlagUncheckedCreateInput = {
    patientId: opts.input.patientId,
    code,
    status: opts.input.status ?? "active",
    severity,
    detail: emptyToNull(opts.input.detail),
    note: emptyToNull(opts.input.note),
    validFrom: dateTimeOrNull(opts.input.validFrom as string | null | undefined),
    validTo: dateTimeOrNull(opts.input.validTo as string | null | undefined),
  };

  return runAuditedMutation({
    patientId: opts.input.patientId,
    actorId: opts.actorId,
    entityType: "CriticalFlag",
    action: "create",
    requestId: opts.requestId,
    mutate: async (tx) => {
      const created = await tx.criticalFlag.create({ data });
      const serialized = serializeCriticalFlag(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function updateCriticalFlag(opts: {
  id: string;
  input: CriticalFlagUpdateInput;
  actorId: string;
  requestId?: string;
}) {
  const existing = await prisma.criticalFlag.findUnique({
    where: { id: opts.id },
  });
  if (!existing) return null;

  if (existing.code === "CUSTOM") {
    const nextDetail =
      opts.input.detail !== undefined
        ? emptyToNull(opts.input.detail)
        : existing.detail;
    const nextNote =
      opts.input.note !== undefined
        ? emptyToNull(opts.input.note)
        : existing.note;
    if (!(nextDetail || nextNote)) {
      throw new CriticalFlagServiceError(
        "Vlastní upozornění vyžaduje text (detail nebo poznámka).",
        400,
      );
    }
  }

  const before = serializeCriticalFlag(existing);
  const data: Prisma.CriticalFlagUpdateInput = {};
  if (opts.input.status !== undefined) data.status = opts.input.status;
  if (opts.input.severity !== undefined) data.severity = opts.input.severity;
  if (opts.input.detail !== undefined) data.detail = emptyToNull(opts.input.detail);
  if (opts.input.note !== undefined) data.note = emptyToNull(opts.input.note);
  if (opts.input.validFrom !== undefined) {
    data.validFrom = dateTimeOrNull(
      opts.input.validFrom as string | null | undefined,
    );
  }
  if (opts.input.validTo !== undefined) {
    data.validTo = dateTimeOrNull(
      opts.input.validTo as string | null | undefined,
    );
  }

  return runAuditedMutation({
    patientId: existing.patientId,
    actorId: opts.actorId,
    entityType: "CriticalFlag",
    action: "update",
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const updated = await tx.criticalFlag.update({
        where: { id: opts.id },
        data,
      });
      const serialized = serializeCriticalFlag(updated);
      return {
        result: serialized,
        entityId: updated.id,
        after: serialized,
      };
    },
  });
}

export class CriticalFlagServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "CriticalFlagServiceError";
    this.status = status;
  }
}
