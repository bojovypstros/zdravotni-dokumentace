import type { Patient, Prisma } from "@prisma/client";

import type { PatientWriteInput } from "@/lib/validation/patient";
import { prisma } from "@/lib/db/prisma";
import { runAuditedMutation } from "@/server/services/audit";

function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function dateOrNull(value: string | undefined | null): Date | null {
  const s = emptyToNull(value ?? null);
  return s ? new Date(`${s}T00:00:00.000Z`) : null;
}

export function toPatientData(
  input: PatientWriteInput,
): Prisma.PatientCreateInput | Prisma.PatientUpdateInput {
  return {
    displayName: input.displayName,
    givenName: emptyToNull(input.givenName),
    familyName: emptyToNull(input.familyName),
    birthDate: dateOrNull(input.birthDate),
    sexAtBirth: input.sexAtBirth ?? null,
    heightCm: input.heightCm ?? null,
    bloodGroup: emptyToNull(input.bloodGroup),
    timezone: input.timezone || "Europe/Prague",
    phone: emptyToNull(input.phone),
    phoneUse: input.phoneUse ?? null,
    email: emptyToNull(input.email),
    addressLine: emptyToNull(input.addressLine),
    addressCity: emptyToNull(input.addressCity),
    addressPostalCode: emptyToNull(input.addressPostalCode),
    addressCountry: emptyToNull(input.addressCountry) ?? "CZ",
    emergencyContactName: emptyToNull(input.emergencyContactName),
    emergencyContactRelationship: emptyToNull(
      input.emergencyContactRelationship,
    ),
    emergencyContactPhone: emptyToNull(input.emergencyContactPhone),
    emergencyContactEmail: emptyToNull(input.emergencyContactEmail),
    contactNote: emptyToNull(input.contactNote),
    preferredName: emptyToNull(input.preferredName),
    addressForm: input.addressForm,
    titlePrefix: emptyToNull(input.titlePrefix),
    titleSuffix: emptyToNull(input.titleSuffix),
    salutationOverride: emptyToNull(input.salutationOverride),
    addressGender: input.addressGender ?? null,
    defaultWeightKg: input.defaultWeightKg ?? null,
    noKnownAllergies: input.noKnownAllergies,
    ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
  };
}

export function serializePatient(p: Patient) {
  return {
    id: p.id,
    displayName: p.displayName,
    givenName: p.givenName,
    familyName: p.familyName,
    birthDate: p.birthDate
      ? p.birthDate.toISOString().slice(0, 10)
      : null,
    sexAtBirth: p.sexAtBirth,
    heightCm: p.heightCm !== null ? Number(p.heightCm) : null,
    bloodGroup: p.bloodGroup,
    timezone: p.timezone,
    phone: p.phone,
    phoneUse: p.phoneUse,
    email: p.email,
    addressLine: p.addressLine,
    addressCity: p.addressCity,
    addressPostalCode: p.addressPostalCode,
    addressCountry: p.addressCountry,
    emergencyContactName: p.emergencyContactName,
    emergencyContactRelationship: p.emergencyContactRelationship,
    emergencyContactPhone: p.emergencyContactPhone,
    emergencyContactEmail: p.emergencyContactEmail,
    contactNote: p.contactNote,
    preferredName: p.preferredName,
    addressForm: p.addressForm,
    titlePrefix: p.titlePrefix,
    titleSuffix: p.titleSuffix,
    salutationOverride: p.salutationOverride,
    addressGender: p.addressGender,
    defaultWeightKg:
      p.defaultWeightKg !== null ? Number(p.defaultWeightKg) : null,
    noKnownAllergies: p.noKnownAllergies,
    isActive: p.isActive,
    archivedAt: p.archivedAt ? p.archivedAt.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/** Kartotéka list filter — default excludes soft-archived patients. */
export type PatientArchiveFilter = "active" | "archived" | "all";

export function parsePatientArchiveFilter(
  raw: string | null | undefined,
): PatientArchiveFilter {
  if (raw === "archived" || raw === "all") return raw;
  return "active";
}

function archiveWhere(
  filter: PatientArchiveFilter,
): Prisma.PatientWhereInput | undefined {
  if (filter === "archived") return { archivedAt: { not: null } };
  if (filter === "all") return undefined;
  return { archivedAt: null };
}

export async function listPatients(opts?: {
  query?: string;
  /** Default: only non-archived (active kartotéka). */
  archive?: PatientArchiveFilter;
}) {
  const q = opts?.query?.trim();
  const archive = opts?.archive ?? "active";
  const archiveClause = archiveWhere(archive);
  const searchClause: Prisma.PatientWhereInput | undefined = q
    ? {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { preferredName: { contains: q, mode: "insensitive" } },
          { givenName: { contains: q, mode: "insensitive" } },
          { familyName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { phone: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

  const where: Prisma.PatientWhereInput | undefined =
    archiveClause && searchClause
      ? { AND: [archiveClause, searchClause] }
      : (archiveClause ?? searchClause);

  const rows = await prisma.patient.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { displayName: "asc" }],
  });
  return rows.map(serializePatient);
}

export async function getPatient(id: string) {
  const row = await prisma.patient.findUnique({ where: { id } });
  return row ? serializePatient(row) : null;
}

export async function createPatient(opts: {
  input: PatientWriteInput;
  actorId: string;
  requestId?: string;
}) {
  const data = toPatientData(opts.input) as Prisma.PatientCreateInput;
  return runAuditedMutation({
    actorId: opts.actorId,
    entityType: "Patient",
    action: "create",
    requestId: opts.requestId,
    resolvePatientId: (result: ReturnType<typeof serializePatient>) =>
      result.id,
    mutate: async (tx) => {
      const created = await tx.patient.create({ data });
      const serialized = serializePatient(created);
      return {
        result: serialized,
        entityId: created.id,
        after: serialized,
      };
    },
  });
}

export async function updatePatient(opts: {
  id: string;
  input: PatientWriteInput;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.patient.findUnique({ where: { id: opts.id } });
  if (!existing) return null;

  // Integrity: noKnownAllergies=true must not coexist with active allergies
  // as “unknown ≠ none”. Setting NKA clears the flag conflict by requiring
  // no active allergy rows — reject otherwise.
  if (opts.input.noKnownAllergies) {
    const activeAllergies = await prisma.allergy.count({
      where: { patientId: opts.id, status: "active" },
    });
    if (activeAllergies > 0) {
      throw new PatientServiceError(
        "Nelze nastavit „bez známých alergií“ při existujících aktivních alergiích.",
        409,
      );
    }
  }

  const data = toPatientData(opts.input) as Prisma.PatientUpdateInput;
  const before = serializePatient(existing);

  return runAuditedMutation({
    patientId: opts.id,
    actorId: opts.actorId,
    entityType: "Patient",
    action: "update",
    reason: opts.reason,
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const updated = await tx.patient.update({
        where: { id: opts.id },
        data,
      });
      return {
        result: serializePatient(updated),
        entityId: updated.id,
        after: serializePatient(updated),
      };
    },
  });
}

export async function archivePatient(opts: {
  id: string;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.patient.findUnique({ where: { id: opts.id } });
  if (!existing) return null;
  if (existing.archivedAt) {
    return serializePatient(existing);
  }

  const before = serializePatient(existing);
  return runAuditedMutation({
    patientId: opts.id,
    actorId: opts.actorId,
    entityType: "Patient",
    action: "archive",
    reason: opts.reason,
    changeSummary: "Pacient archivován (soft archive).",
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const updated = await tx.patient.update({
        where: { id: opts.id },
        data: { archivedAt: new Date() },
      });
      const after = serializePatient(updated);
      return { result: after, entityId: updated.id, after };
    },
  });
}

export async function unarchivePatient(opts: {
  id: string;
  actorId: string;
  requestId?: string;
  reason?: string;
}) {
  const existing = await prisma.patient.findUnique({ where: { id: opts.id } });
  if (!existing) return null;
  if (!existing.archivedAt) {
    return serializePatient(existing);
  }

  const before = serializePatient(existing);
  return runAuditedMutation({
    patientId: opts.id,
    actorId: opts.actorId,
    entityType: "Patient",
    action: "restore",
    reason: opts.reason,
    changeSummary: "Pacient obnoven z archivu.",
    before,
    requestId: opts.requestId,
    mutate: async (tx) => {
      const updated = await tx.patient.update({
        where: { id: opts.id },
        data: { archivedAt: null },
      });
      const after = serializePatient(updated);
      return { result: after, entityId: updated.id, after };
    },
  });
}

export class PatientServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PatientServiceError";
    this.status = status;
  }
}
