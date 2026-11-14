import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import PDFDocument from "pdfkit";

import { DEFAULT_TIMEZONE, formatInPatientTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import { createAuditEvent } from "@/server/services/audit";
import { listClinicalNotes } from "@/server/services/clinical-note";
import { listDocuments } from "@/server/services/document";
import { listMedicationAdministrations } from "@/server/services/medication-administration";
import { listMedicationOrders } from "@/server/services/medication-order";
import { listObservations } from "@/server/services/observation";
import { listSymptomEntries } from "@/server/services/symptom";
import { listDiaryScaleReadings } from "@/server/services/diary-scale";

export class ExportServiceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ExportServiceError";
    this.status = status;
  }
}

export type ExportRange = {
  from: Date | null;
  to: Date | null;
};

export type ExportMeta = {
  generatedAt: string;
  timeZone: string;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  patientId: string;
  patientDisplayName: string;
  sources: string[];
  format: "json" | "csv" | "pdf";
  app: string;
  disclaimer: string;
};

async function loadPatient(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new ExportServiceError("Pacient nenalezen.", 404);
  return patient;
}

export async function collectExportPayload(opts: {
  patientId: string;
  range: ExportRange;
}) {
  const patient = await loadPatient(opts.patientId);
  const tz = patient.timezone || DEFAULT_TIMEZONE;
  const from = opts.range.from ?? undefined;
  const to = opts.range.to ?? undefined;

  const [
    diagnoses,
    allergies,
    observations,
    medicationOrders,
    medicationAdministrations,
    clinicalNotes,
    symptoms,
    diaryScaleReadings,
    documents,
  ] = await Promise.all([
    prisma.diagnosis.findMany({
      where: { patientId: opts.patientId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.allergy.findMany({
      where: { patientId: opts.patientId },
      orderBy: { createdAt: "asc" },
    }),
    listObservations({ patientId: opts.patientId, from, to, limit: 5000 }),
    listMedicationOrders({ patientId: opts.patientId }),
    listMedicationAdministrations({
      patientId: opts.patientId,
      from,
      to,
      limit: 5000,
    }),
    listClinicalNotes({
      patientId: opts.patientId,
      from,
      to,
      limit: 5000,
    }),
    listSymptomEntries({
      patientId: opts.patientId,
      from,
      to,
      limit: 5000,
    }),
    listDiaryScaleReadings({
      patientId: opts.patientId,
      from,
      to,
      limit: 5000,
    }),
    listDocuments(opts.patientId),
  ]);

  const meta: ExportMeta = {
    generatedAt: new Date().toISOString(),
    timeZone: tz,
    dateRange: {
      from: opts.range.from ? opts.range.from.toISOString() : null,
      to: opts.range.to ? opts.range.to.toISOString() : null,
    },
    patientId: patient.id,
    patientDisplayName: patient.displayName,
    sources: [
      "patient",
      "diagnoses",
      "allergies",
      "observations",
      "medicationOrders",
      "medicationAdministrations",
      "clinicalNotes",
      "symptoms",
      "diaryScaleReadings",
      "documents_metadata",
    ],
    format: "json",
    app: "zdravotni-dokumentace",
    disclaimer:
      "Osobní evidence — ne zdravotnický prostředek, ne oficiální zdravotnická dokumentace poskytovatele.",
  };

  return {
    meta,
    patient: {
      id: patient.id,
      displayName: patient.displayName,
      givenName: patient.givenName,
      familyName: patient.familyName,
      birthDate: patient.birthDate
        ? patient.birthDate.toISOString().slice(0, 10)
        : null,
      timezone: patient.timezone,
      noKnownAllergies: patient.noKnownAllergies,
    },
    diagnoses,
    allergies,
    observations,
    medicationOrders,
    medicationAdministrations,
    clinicalNotes,
    symptoms,
    diaryScaleReadings,
    documents,
  };
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

function rowsToCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvEscape).join(",")];
  for (const row of rows) {
    lines.push(row.map(csvEscape).join(","));
  }
  return lines.join("\n") + "\n";
}

export async function buildJsonExport(opts: {
  patientId: string;
  range: ExportRange;
  actorId: string;
  requestId?: string;
}) {
  const payload = await collectExportPayload(opts);
  payload.meta.format = "json";
  await createAuditEvent(prisma, {
    patientId: opts.patientId,
    actorId: opts.actorId,
    entityType: "Export",
    entityId: opts.patientId,
    action: "export",
    changeSummary: "JSON export",
    after: {
      format: "json",
      dateRange: payload.meta.dateRange,
      generatedAt: payload.meta.generatedAt,
    },
    requestId: opts.requestId,
  });
  return {
    body: Buffer.from(JSON.stringify(payload, null, 2), "utf8"),
    meta: payload.meta,
    fileName: `export-${opts.patientId.slice(0, 8)}-${payload.meta.generatedAt.slice(0, 10)}.json`,
    contentType: "application/json; charset=utf-8",
  };
}

export async function buildCsvExport(opts: {
  patientId: string;
  range: ExportRange;
  actorId: string;
  requestId?: string;
}) {
  const payload = await collectExportPayload(opts);
  payload.meta.format = "csv";

  const sections: string[] = [];
  sections.push("# meta");
  sections.push(
    rowsToCsv(
      [
        "generatedAt",
        "timeZone",
        "from",
        "to",
        "patientId",
        "patientDisplayName",
        "format",
        "disclaimer",
      ],
      [
        [
          payload.meta.generatedAt,
          payload.meta.timeZone,
          payload.meta.dateRange.from,
          payload.meta.dateRange.to,
          payload.meta.patientId,
          payload.meta.patientDisplayName,
          "csv",
          payload.meta.disclaimer,
        ],
      ],
    ).trimEnd(),
  );

  sections.push("\n# observations");
  sections.push(
    rowsToCsv(
      [
        "id",
        "occurredAt",
        "unit",
        "numericValue",
        "secondaryNumericValue",
        "textValue",
        "notes",
      ],
      payload.observations.map((o) => [
        o.id,
        o.occurredAt,
        o.unit,
        o.numericValue,
        o.secondaryNumericValue,
        o.textValue,
        o.notes,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# medication_administrations");
  sections.push(
    rowsToCsv(
      [
        "id",
        "occurredAt",
        "medicationNameSnapshot",
        "doseValue",
        "doseUnit",
        "status",
        "notes",
      ],
      payload.medicationAdministrations.map((a) => [
        a.id,
        a.occurredAt,
        a.medicationNameSnapshot,
        a.doseValue,
        a.doseUnit,
        a.status,
        a.notes,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# clinical_notes");
  sections.push(
    rowsToCsv(
      ["id", "occurredAt", "noteType", "title", "body"],
      payload.clinicalNotes.map((n) => [
        n.id,
        n.occurredAt,
        n.noteType,
        n.title,
        n.body,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# symptoms");
  sections.push(
    rowsToCsv(
      ["id", "occurredAt", "symptom", "intensity", "notes"],
      payload.symptoms.map((s) => [
        s.id,
        s.occurredAt,
        s.symptom,
        s.intensity,
        s.notes,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# documents_metadata");
  sections.push(
    rowsToCsv(
      [
        "id",
        "originalFileName",
        "mimeType",
        "sizeBytes",
        "documentType",
        "uploadedAt",
        "checksum",
      ],
      payload.documents.map((d) => [
        d.id,
        d.originalFileName,
        d.mimeType,
        d.sizeBytes,
        d.documentType,
        d.uploadedAt,
        d.checksum,
      ]),
    ).trimEnd(),
  );

  await createAuditEvent(prisma, {
    patientId: opts.patientId,
    actorId: opts.actorId,
    entityType: "Export",
    entityId: opts.patientId,
    action: "export",
    changeSummary: "CSV export",
    after: {
      format: "csv",
      dateRange: payload.meta.dateRange,
      generatedAt: payload.meta.generatedAt,
    },
    requestId: opts.requestId,
  });

  const body = Buffer.from(sections.join("\n") + "\n", "utf8");
  return {
    body,
    meta: payload.meta,
    fileName: `export-${opts.patientId.slice(0, 8)}-${payload.meta.generatedAt.slice(0, 10)}.csv`,
    contentType: "text/csv; charset=utf-8",
  };
}

function fontPath(): string {
  return path.join(process.cwd(), "assets/fonts/DejaVuSans.ttf");
}

export async function buildPdfExport(opts: {
  patientId: string;
  range: ExportRange;
  actorId: string;
  requestId?: string;
}): Promise<{
  body: Buffer;
  meta: ExportMeta;
  fileName: string;
  contentType: string;
}> {
  const payload = await collectExportPayload(opts);
  payload.meta.format = "pdf";
  const tz = payload.meta.timeZone;

  const tmp = await mkdtemp(path.join(os.tmpdir(), "zd-pdf-"));
  const outPath = path.join(tmp, "export.pdf");

  try {
    const doc = new PDFDocument({
      margin: 50,
      info: {
        Title: "Výpis zdravotní evidence",
        Author: "zdravotni-dokumentace",
        Subject: payload.meta.disclaimer,
      },
    });
    doc.registerFont("DejaVu", fontPath());
    doc.font("DejaVu");

    const stream = createWriteStream(outPath);
    const finished = pipeline(doc, stream);

    doc.fontSize(16).text("Výpis zdravotní evidence", { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);
    doc.text(`Pacient: ${payload.meta.patientDisplayName}`);
    doc.text(`Vygenerováno: ${formatInPatientTz(payload.meta.generatedAt, "d. M. yyyy HH:mm", tz)} (${tz})`);
    doc.text(
      `Období: ${
        payload.meta.dateRange.from
          ? formatInPatientTz(payload.meta.dateRange.from, "d. M. yyyy HH:mm", tz)
          : "bez omezení"
      } – ${
        payload.meta.dateRange.to
          ? formatInPatientTz(payload.meta.dateRange.to, "d. M. yyyy HH:mm", tz)
          : "bez omezení"
      }`,
    );
    doc.text(`Zdroje: ${payload.meta.sources.join(", ")}`);
    doc.moveDown(0.5);
    doc.fillColor("#444444").text(payload.meta.disclaimer, { width: 500 });
    doc.fillColor("#000000");
    doc.moveDown();

    const section = (title: string) => {
      doc.moveDown(0.5);
      doc.fontSize(12).text(title, { underline: true });
      doc.fontSize(9);
    };

    section("Diagnózy");
    if (payload.diagnoses.length === 0) doc.text("—");
    for (const d of payload.diagnoses.slice(0, 40)) {
      doc.text(`• ${d.display} (${d.status})`);
    }

    section("Alergie");
    if (payload.patient.noKnownAllergies) {
      doc.text("Žádné známé alergie (NKA).");
    } else if (payload.allergies.length === 0) {
      doc.text("— / neznámé");
    } else {
      for (const a of payload.allergies.slice(0, 40)) {
        doc.text(`• ${a.substance} (${a.severity}, ${a.status})`);
      }
    }

    section("Měření (observations)");
    if (payload.observations.length === 0) doc.text("—");
    for (const o of payload.observations.slice(0, 60)) {
      const when = formatInPatientTz(o.occurredAt, "d. M. HH:mm", tz);
      const val =
        o.secondaryNumericValue != null
          ? `${o.numericValue}/${o.secondaryNumericValue}`
          : (o.numericValue ?? o.textValue ?? "");
      doc.text(`• ${when}: ${val} ${o.unit}`);
    }

    section("Podání léků");
    if (payload.medicationAdministrations.length === 0) doc.text("—");
    for (const a of payload.medicationAdministrations.slice(0, 60)) {
      const when = formatInPatientTz(a.occurredAt, "d. M. HH:mm", tz);
      doc.text(
        `• ${when}: ${a.medicationNameSnapshot} ${a.doseValue} ${a.doseUnit} (${a.status})`,
      );
    }

    section("Poznámky");
    if (payload.clinicalNotes.length === 0) doc.text("—");
    for (const n of payload.clinicalNotes.slice(0, 40)) {
      const when = formatInPatientTz(n.occurredAt, "d. M. HH:mm", tz);
      const preview =
        n.body.length > 160 ? `${n.body.slice(0, 157)}…` : n.body;
      doc.text(`• ${when} [${n.noteType}]: ${preview}`);
    }

    section("Symptomy");
    if (payload.symptoms.length === 0) doc.text("—");
    for (const s of payload.symptoms.slice(0, 40)) {
      const when = formatInPatientTz(s.occurredAt, "d. M. HH:mm", tz);
      doc.text(`• ${when}: ${s.symptom}${s.intensity != null ? ` (${s.intensity})` : ""}`);
    }

    section("Dokumenty (metadata)");
    if (payload.documents.length === 0) doc.text("—");
    for (const d of payload.documents.slice(0, 40)) {
      doc.text(
        `• ${d.originalFileName} (${d.mimeType}, ${d.sizeBytes} B, ${d.documentType})`,
      );
    }

    doc.end();
    await finished;

    const body = await readFile(outPath);

    await createAuditEvent(prisma, {
      patientId: opts.patientId,
      actorId: opts.actorId,
      entityType: "Export",
      entityId: opts.patientId,
      action: "export",
      changeSummary: "PDF výpis",
      after: {
        format: "pdf",
        dateRange: payload.meta.dateRange,
        generatedAt: payload.meta.generatedAt,
      },
      requestId: opts.requestId,
    });

    return {
      body,
      meta: payload.meta,
      fileName: `vypis-${opts.patientId.slice(0, 8)}-${payload.meta.generatedAt.slice(0, 10)}.pdf`,
      contentType: "application/pdf",
    };
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}
