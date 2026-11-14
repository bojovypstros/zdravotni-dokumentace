# Data Model – Personal Clinical Record

Datový model je FHIR-inspired, nikoliv plná implementace HL7 FHIR. Při návrhu zachovat sémantické oddělení klinických konceptů.

## 1. Vztahy

```text
Patient
 ├── Encounter
 ├── Diagnosis
 ├── Allergy
 ├── MedicationOrder
 │    └── MedicationAdministration
 ├── ObservationDefinition
 │    └── Observation
 ├── SymptomEntry
 ├── DiaryScaleDefinition
 │    └── DiaryScaleSetting
 ├── DiaryScaleReading
 ├── ClinicalNote
 ├── LabPanel
 │    └── LabResult
 ├── FluidBalanceEntry
 ├── Procedure
 ├── Document
 └── AuditEvent
```

## 2. Základní entity

### Patient
- id: UUID
- displayName
- givenName / familyName (optional)
- birthDate (optional)
- sexAtBirth (optional, only if user chooses to record)
- heightCm (optional)
- bloodGroup (optional)
- timezone (default Europe/Prague)
- createdAt, updatedAt

### Encounter
Volitelný kontextový pobyt/epizoda (např. hospitalizace, ambulantní návštěva, období sledování).
- id, patientId
- type: hospitalization | outpatient | emergency | self_monitoring | other
- title
- startAt, endAt
- status: planned | in_progress | completed | cancelled (Phase 9)
- facilityLabel (optional; facility/provider label)
- reason (optional)
- notes (optional)

### Diagnosis
- id, patientId
- display
- codeSystem (optional)
- code (optional)
- status: active | in_remission | resolved | unconfirmed | historical
- onsetDate (optional)
- resolvedDate (optional)
- source
- notes

### Allergy
- id, patientId
- substance
- reaction
- severity: mild | moderate | severe | unknown
- status: active | inactive | unconfirmed
- verification: confirmed_by_clinician | patient_reported | unknown
- onsetDate (optional)
- notes

### MedicationOrder
Ordinace/evidence medikace; sama o sobě není důkazem užití.
- id, patientId
- medicationName
- activeIngredient (optional)
- strengthValue / strengthUnit (optional)
- form (optional)
- doseValue / doseUnit
- route
- regimen: scheduled | prn | once | course | other
- frequencyText (optional)
- scheduledTimes (JSON array of local times, optional)
- instructions (optional)
- indication (optional)
- startAt
- endAt (optional)
- status: draft | active | paused | completed | discontinued | cancelled
- sourceType: clinician_order | patient_recorded_plan | historical | other
- sourceLabel (optional)
- createdAt, updatedAt

### MedicationAdministration
Konkrétní událost skutečného užití/podání.
- id, patientId, medicationOrderId (nullable for one-off medication)
- medicationNameSnapshot
- doseValue, doseUnit
- routeSnapshot
- status: taken | partially_taken | refused | omitted | delayed | unknown
- occurredAt
- recordedAt
- reason (optional)
- notes (optional)
- idempotencyKey (unique)
- createdAt

Snapshot polí zajistí, že historická událost zůstane srozumitelná i po změně názvu/ordinace léku.

### ObservationDefinition
Konfigurovatelná definice měřené veličiny.
- id, patientId (nullable for system defaults)
- key (e.g. blood_pressure_systolic)
- label
- category: vital_sign | laboratory | body_measurement | symptom_score | custom
- valueType: quantity | integer | decimal | boolean | text | ratio
- canonicalUnit (optional)
- allowedUnits (JSON)
- displayPrecision
- lowerReference / upperReference (optional; metadata only, not diagnosis)
- isSystem
- isActive

### Observation
- id, patientId
- definitionId
- numericValue (nullable)
- secondaryNumericValue (nullable; e.g. diastolic for BP if modeled as paired)
- textValue (nullable)
- unit
- occurredAt
- recordedAt
- method (optional)
- bodySite (optional)
- context (optional)
- source: manual | device_import | document_import
- notes (optional)

For blood pressure, prefer one Observation record with systolic and diastolic values as a structured pair, rather than unrelated measurements.

### SymptomEntry
- id, patientId
- symptom
- intensity (optional, numeric)
- intensityScale (optional, e.g. 0-10)
- location (optional)
- character (optional)
- onsetAt (optional)
- endedAt (optional)
- occurredAt
- recordedAt
- context (optional)
- notes (optional)

### DiaryScaleDefinition / DiaryScaleSetting / DiaryScaleReading
Configurable subjective diary scales (PRD §6.6 + Gate: full symptom diary).
- DiaryScaleDefinition: key, label, minValue, maxValue, sortOrder; system rows have patientId null (mood, anxiety, energy, fatigue, sleep, pain, nausea)
- DiaryScaleSetting: per-patient enable/disable (+ optional min/max override)
- DiaryScaleReading: occurredAt, recordedAt, values JSON `{ "mood": 7, … }`, notes

### ClinicalNote
Personal clinical-style note, not an official clinical record.
- id, patientId
- noteType: **`DIARY` \| `VISIT_SUMMARY` \| `MEDICATION_NOTE` \| `RESULT_NOTE` \| `CARE_NOTE` \| `OTHER`** (Gate / research lock; overrides earlier subjective|objective draft)
- title (optional)
- body
- occurredAt
- recordedAt
- source: manual | import | other

Do not label patient-authored content as physician assessment. UI label should make author/source clear.

### LabPanel and LabResult
LabPanel:
- id, patientId, title, collectedAt, resultedAt, laboratory (optional), source, notes

LabResult:
- id, panelId
- analyte
- valueNumeric / valueText
- unit
- referenceLow / referenceHigh (optional)
- referenceText (optional)
- flag: low | high | normal | abnormal_unspecified | unknown
- notes

Store reference ranges per result because they vary by laboratory, method, age and context.

### FluidBalanceEntry (Phase 9)
- id, patientId
- direction: intake | output
- category (free text, e.g. oral / IV / urine)
- amountMl
- occurredAt
- notes
Daily intake/output/net totals are computed in the service layer (not stored).

### Procedure (Phase 9)
- id, patientId
- display
- status: planned | completed | cancelled | unknown
- occurredAt
- performerLabel (optional)
- outcome (optional)
- notes

### Document
- id, patientId
- originalFileName
- storageKey
- mimeType
- sizeBytes
- documentType
- documentDate (optional)
- uploadedAt
- sourceLabel (optional)
- notes (optional)
- checksum

### AuditEvent
- id, patientId
- actorId
- entityType
- entityId
- action: create | update | correction | archive | restore | export | backup | login
- occurredAt
- reason (optional)
- changeSummary (avoid duplicating excessive sensitive text)
- requestId (optional)

## 3. Common fields

For all relevant entities:
- `id` UUID
- `patientId` UUID FK
- `createdAt`
- `updatedAt` where mutable
- `occurredAt` for event time
- `recordedAt` for data-entry time
- optional `source` / provenance metadata

## 4. Integrity rules

1. `patientId` must match the patient referenced by any linked entity.
2. A MedicationAdministration may reference only a MedicationOrder belonging to the same patient.
3. A MedicationOrder status change must not rewrite historical administrations.
4. Deleting an order must not cascade-delete administrations.
5. An Observation must use a compatible value type and unit for its definition.
6. Clinical event correction must preserve original value and create audit trail.
7. A record with unknown allergy status must not be represented as “no known allergies”.
8. Lab reference ranges belong to each result.
9. Use decimal-safe numeric types (Prisma Decimal / PostgreSQL NUMERIC) for quantities where appropriate; avoid floating-point precision loss.
10. Add indexes on `(patientId, occurredAt)`, `(patientId, status)` where relevant, and foreign keys.

## 5. FHIR mapping (conceptual)
- Patient → Patient
- Encounter → Encounter
- Diagnosis → Condition
- Allergy → AllergyIntolerance
- MedicationOrder → MedicationRequest
- MedicationAdministration → MedicationAdministration
- ObservationDefinition / Observation → Observation
- LabPanel → DiagnosticReport (conceptual grouping)
- LabResult → Observation
- ClinicalNote → Composition / DocumentReference (conceptual)
- Document → DocumentReference
- AuditEvent → AuditEvent / Provenance concepts

Do not serialize to FHIR JSON unless a future interoperability feature explicitly requires it.
