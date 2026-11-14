import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import PDFDocument from "pdfkit";

import { CRITICAL_FLAG_LABELS, CRITICAL_FLAG_SEVERITY_LABELS } from "@/lib/critical-flags";
import { DEFAULT_TIMEZONE, formatInPatientTz } from "@/lib/datetime/prague";
import { prisma } from "@/lib/db/prisma";
import {
  ALLERGY_SEVERITY_LABELS,
  ALLERGY_STATUS_LABELS,
  ALLERGY_VERIFICATION_LABELS,
  CLINICAL_NOTE_SOURCE_LABELS,
  CLINICAL_NOTE_TYPE_LABELS,
  CRITICAL_FLAG_STATUS_LABELS,
  DIAGNOSIS_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  ENCOUNTER_STATUS_LABELS,
  ENCOUNTER_TYPE_LABELS,
  EXPORT_SOURCE_LABELS,
  FLUID_DIRECTION_LABELS,
  LAB_RESULT_FLAG_LABELS,
  MEDICATION_ADMIN_STATUS_LABELS,
  MEDICATION_ORDER_STATUS_LABELS,
  MEDICATION_REGIMEN_LABELS,
  MEDICATION_ROUTE_LABELS,
  MEDICATION_SOURCE_TYPE_LABELS,
  OBSERVATION_CATEGORY_LABELS,
  OBSERVATION_SOURCE_LABELS,
  PROCEDURE_STATUS_LABELS,
  csLabel,
  fluidCategoryLabel,
} from "@/lib/labels/cs";
import { createAuditEvent } from "@/server/services/audit";
import { listClinicalNotes } from "@/server/services/clinical-note";
import { listDiaryScaleReadings } from "@/server/services/diary-scale";
import { listDocuments } from "@/server/services/document";
import { listEncounters } from "@/server/services/encounter";
import { listFluidBalanceEntries } from "@/server/services/fluid";
import { listLabPanels } from "@/server/services/lab";
import { listMedicationAdministrations } from "@/server/services/medication-administration";
import { listMedicationOrders } from "@/server/services/medication-order";
import { listObservations } from "@/server/services/observation";
import { listProcedures } from "@/server/services/procedure";
import { listSymptomEntries } from "@/server/services/symptom";

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
    criticalFlags,
    observations,
    medicationOrders,
    medicationAdministrations,
    clinicalNotes,
    symptoms,
    diaryScaleReadings,
    documents,
    labPanels,
    fluidBalanceEntries,
    procedures,
    encounters,
  ] = await Promise.all([
    prisma.diagnosis.findMany({
      where: { patientId: opts.patientId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.allergy.findMany({
      where: { patientId: opts.patientId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.criticalFlag.findMany({
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
    listLabPanels({ patientId: opts.patientId, from, to, limit: 5000 }),
    listFluidBalanceEntries({
      patientId: opts.patientId,
      from,
      to,
      limit: 5000,
    }),
    listProcedures({ patientId: opts.patientId, from, to, limit: 5000 }),
    listEncounters({ patientId: opts.patientId, from, to, limit: 5000 }),
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
      "criticalFlags",
      "observations",
      "medicationOrders",
      "medicationAdministrations",
      "clinicalNotes",
      "symptoms",
      "diaryScaleReadings",
      "documents_metadata",
      "labPanels",
      "fluidBalanceEntries",
      "procedures",
      "encounters",
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
      archivedAt: patient.archivedAt
        ? patient.archivedAt.toISOString()
        : null,
      stavKartoteky: patient.archivedAt ? "archivovaný" : "aktivní",
    },
    diagnoses,
    allergies,
    criticalFlags,
    observations,
    medicationOrders,
    medicationAdministrations,
    clinicalNotes,
    symptoms,
    diaryScaleReadings,
    documents,
    labPanels,
    fluidBalanceEntries,
    procedures,
    encounters,
  };
}

type ExportPayload = Awaited<ReturnType<typeof collectExportPayload>>;

/**
 * User-facing export: enum/slug codes → Czech labels (DB/API stay coded).
 * Return typed as ExportPayload for convenience; runtime enum fields are Czech strings.
 */
function localizeExportPayload(payload: ExportPayload): ExportPayload {
  return {
    ...payload,
    meta: {
      ...payload.meta,
      sources: payload.meta.sources.map((s) =>
        csLabel(EXPORT_SOURCE_LABELS, s),
      ),
    },
    diagnoses: payload.diagnoses.map((d) => ({
      ...d,
      status: csLabel(DIAGNOSIS_STATUS_LABELS, d.status),
    })),
    allergies: payload.allergies.map((a) => ({
      ...a,
      severity: csLabel(ALLERGY_SEVERITY_LABELS, a.severity),
      status: csLabel(ALLERGY_STATUS_LABELS, a.status),
      verification: csLabel(ALLERGY_VERIFICATION_LABELS, a.verification),
    })),
    criticalFlags: payload.criticalFlags.map((f) => ({
      ...f,
      code:
        CRITICAL_FLAG_LABELS[f.code as keyof typeof CRITICAL_FLAG_LABELS] ??
        f.code,
      status: csLabel(CRITICAL_FLAG_STATUS_LABELS, f.status),
      severity:
        CRITICAL_FLAG_SEVERITY_LABELS[
          f.severity as keyof typeof CRITICAL_FLAG_SEVERITY_LABELS
        ] ?? f.severity,
    })),
    observations: payload.observations.map((o) => ({
      ...o,
      category: csLabel(OBSERVATION_CATEGORY_LABELS, o.category),
      source: csLabel(OBSERVATION_SOURCE_LABELS, o.source),
    })),
    medicationOrders: payload.medicationOrders.map((o) => ({
      ...o,
      route: csLabel(MEDICATION_ROUTE_LABELS, o.route),
      regimen: csLabel(MEDICATION_REGIMEN_LABELS, o.regimen),
      status: csLabel(MEDICATION_ORDER_STATUS_LABELS, o.status),
      sourceType: csLabel(MEDICATION_SOURCE_TYPE_LABELS, o.sourceType),
    })),
    medicationAdministrations: payload.medicationAdministrations.map((a) => ({
      ...a,
      routeSnapshot: csLabel(MEDICATION_ROUTE_LABELS, a.routeSnapshot),
      status: csLabel(MEDICATION_ADMIN_STATUS_LABELS, a.status),
    })),
    clinicalNotes: payload.clinicalNotes.map((n) => ({
      ...n,
      noteType: csLabel(CLINICAL_NOTE_TYPE_LABELS, n.noteType),
      source: csLabel(CLINICAL_NOTE_SOURCE_LABELS, n.source),
    })),
    documents: payload.documents.map((d) => ({
      ...d,
      documentType: csLabel(DOCUMENT_TYPE_LABELS, d.documentType),
    })),
    labPanels: payload.labPanels.map((p) => ({
      ...p,
      results: p.results.map((r) => ({
        ...r,
        flag: csLabel(LAB_RESULT_FLAG_LABELS, r.flag),
      })),
    })),
    fluidBalanceEntries: payload.fluidBalanceEntries.map((e) => ({
      ...e,
      direction: csLabel(FLUID_DIRECTION_LABELS, e.direction),
      category: fluidCategoryLabel(e.category),
    })),
    procedures: payload.procedures.map((p) => ({
      ...p,
      status: csLabel(PROCEDURE_STATUS_LABELS, p.status),
    })),
    encounters: payload.encounters.map((e) => ({
      ...e,
      type: csLabel(ENCOUNTER_TYPE_LABELS, e.type),
      status: csLabel(ENCOUNTER_STATUS_LABELS, e.status),
    })),
  } as unknown as ExportPayload;
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
  const payload = localizeExportPayload(await collectExportPayload(opts));
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
  const payload = localizeExportPayload(await collectExportPayload(opts));
  payload.meta.format = "csv";

  const sections: string[] = [];
  sections.push("# meta");
  sections.push(
    rowsToCsv(
      [
        "vygenerovano",
        "casovePasmo",
        "od",
        "do",
        "pacientId",
        "pacient",
        "format",
        "upozorneni",
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

  sections.push("\n# mereni");
  sections.push(
    rowsToCsv(
      [
        "id",
        "cas",
        "velicina",
        "jednotka",
        "hodnota",
        "hodnota2",
        "text",
        "kategorie",
        "zdroj",
        "poznamka",
      ],
      payload.observations.map((o) => [
        o.id,
        o.occurredAt,
        o.definitionLabel,
        o.unit,
        o.numericValue,
        o.secondaryNumericValue,
        o.textValue,
        o.category,
        o.source,
        o.notes,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# podani_leku");
  sections.push(
    rowsToCsv(
      [
        "id",
        "cas",
        "lek",
        "davka",
        "jednotka",
        "stav",
        "poznamka",
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

  sections.push("\n# poznamky");
  sections.push(
    rowsToCsv(
      ["id", "cas", "typ", "titulek", "text"],
      payload.clinicalNotes.map((n) => [
        n.id,
        n.occurredAt,
        n.noteType,
        n.title,
        n.body,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# symptomy");
  sections.push(
    rowsToCsv(
      ["id", "cas", "symptom", "intenzita", "poznamka"],
      payload.symptoms.map((s) => [
        s.id,
        s.occurredAt,
        s.symptom,
        s.intensity,
        s.notes,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# dokumenty_metadata");
  sections.push(
    rowsToCsv(
      [
        "id",
        "soubor",
        "mime",
        "velikostB",
        "typ",
        "nahrano",
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

  sections.push("\n# laborator");
  sections.push(
    rowsToCsv(
      [
        "panelId",
        "nazev",
        "odber",
        "vysledek",
        "analyt",
        "hodnota",
        "text",
        "jednotka",
        "priznak",
      ],
      payload.labPanels.flatMap((p) =>
        p.results.map((r) => [
          p.id,
          p.title,
          p.collectedAt,
          p.resultedAt,
          r.analyte,
          r.valueNumeric,
          r.valueText,
          r.unit,
          r.flag,
        ]),
      ),
    ).trimEnd(),
  );

  sections.push("\n# tekutiny");
  sections.push(
    rowsToCsv(
      ["id", "cas", "smer", "kategorie", "objemMl", "poznamka"],
      payload.fluidBalanceEntries.map((e) => [
        e.id,
        e.occurredAt,
        e.direction,
        e.category,
        e.amountMl,
        e.notes,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# vykony");
  sections.push(
    rowsToCsv(
      ["id", "cas", "nazev", "stav", "provedl", "vysledek"],
      payload.procedures.map((p) => [
        p.id,
        p.occurredAt,
        p.display,
        p.status,
        p.performerLabel,
        p.outcome,
      ]),
    ).trimEnd(),
  );

  sections.push("\n# udalosti");
  sections.push(
    rowsToCsv(
      ["id", "zacatek", "konec", "typ", "nazev", "stav", "zarizeni"],
      payload.encounters.map((e) => [
        e.id,
        e.startAt,
        e.endAt,
        e.type,
        e.title,
        e.status,
        e.facilityLabel,
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
  const payload = localizeExportPayload(await collectExportPayload(opts));
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

    section("Kritická upozornění");
    if (payload.criticalFlags.length === 0) doc.text("—");
    for (const f of payload.criticalFlags.slice(0, 40)) {
      const codeLabel = String(f.code);
      doc.text(
        `• ${codeLabel} (${f.severity}, ${f.status})${f.detail ? ` — ${f.detail}` : ""}`,
      );
    }

    section("Měření");
    if (payload.observations.length === 0) doc.text("—");
    for (const o of payload.observations.slice(0, 60)) {
      const when = formatInPatientTz(o.occurredAt, "d. M. HH:mm", tz);
      const val =
        o.secondaryNumericValue != null
          ? `${o.numericValue}/${o.secondaryNumericValue}`
          : (o.numericValue ?? o.textValue ?? "");
      doc.text(`• ${when}: ${o.definitionLabel} ${val} ${o.unit}`);
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

    section("Laboratoř");
    if (payload.labPanels.length === 0) doc.text("—");
    for (const p of payload.labPanels.slice(0, 30)) {
      const when = p.collectedAt
        ? formatInPatientTz(p.collectedAt, "d. M. HH:mm", tz)
        : p.resultedAt
          ? formatInPatientTz(p.resultedAt, "d. M. HH:mm", tz)
          : "";
      doc.text(`• ${when}: ${p.title}`);
      for (const r of p.results.slice(0, 8)) {
        const val =
          r.valueNumeric != null
            ? `${r.valueNumeric}${r.unit ? ` ${r.unit}` : ""}`
            : (r.valueText ?? "");
        doc.text(`   - ${r.analyte}: ${val} (${r.flag})`);
      }
    }

    section("Tekutiny");
    if (payload.fluidBalanceEntries.length === 0) doc.text("—");
    for (const e of payload.fluidBalanceEntries.slice(0, 40)) {
      const when = formatInPatientTz(e.occurredAt, "d. M. HH:mm", tz);
      doc.text(
        `• ${when}: ${e.direction} ${e.amountMl} ml (${e.category})`,
      );
    }

    section("Výkony");
    if (payload.procedures.length === 0) doc.text("—");
    for (const p of payload.procedures.slice(0, 40)) {
      const when = formatInPatientTz(p.occurredAt, "d. M. HH:mm", tz);
      doc.text(`• ${when}: ${p.display} (${p.status})`);
    }

    section("Události / pobyty");
    if (payload.encounters.length === 0) doc.text("—");
    for (const e of payload.encounters.slice(0, 40)) {
      const when = formatInPatientTz(e.startAt, "d. M. HH:mm", tz);
      doc.text(`• ${when}: ${e.title} [${e.type} / ${e.status}]`);
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
