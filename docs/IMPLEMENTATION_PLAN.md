# Implementation Plan – CursorAI

## 0. Working agreement
Before coding:
1. Read README, PRD, Architecture, Data Model and UX/UI spec.
2. Produce an implementation plan and file tree.
3. List assumptions and risks.
4. Do not invent requirements; record open questions.
5. Do not implement all modules in one pass.

After each phase:
- run `pnpm lint`;
- run `pnpm typecheck`;
- run relevant tests;
- report files changed, tests run, known limitations.

## Phase 1 – Foundation
- Initialize Next.js App Router + TypeScript + pnpm.
- Configure Tailwind and shadcn/ui.
- Add design tokens and light/dark theme.
- Add app shell: desktop sidebar, topbar, mobile bottom navigation.
- Add responsive breakpoints and safe-area support.
- Add Docker Compose for Next.js + PostgreSQL.
- Add Prisma and initial migration.
- Add health check endpoint.
Acceptance:
- app starts locally;
- desktop and iPhone viewport shell renders correctly;
- no console errors;
- DB connection works;
- no real health data in seed.

## Phase 2 – Authentication and patient profile
- Implement first-run setup for admin account.
- Argon2id password hashing.
- Session management and protected routes.
- Patient profile CRUD.
- Diagnosis and allergy basics.
- Audit event infrastructure.
Acceptance:
- unauthenticated users cannot read any patient API;
- session cookie flags correct;
- create/edit profile works;
- allergy unknown vs none is represented correctly.

## Phase 3 – Observations
- ObservationDefinition system catalog.
- Custom observation definitions.
- Add/edit/correct observations.
- Blood pressure pair support.
- Unit metadata and numeric precision.
- History table and Recharts trends.
Acceptance:
- add BP, pulse, temperature, SpO2;
- custom measurement works;
- event appears in timeline;
- time zone is correct;
- no fabricated/interpolated values.

## Phase 4 – Medication
- MedicationOrder CRUD.
- MedicationAdministration create flow.
- Statuses: taken, partial, refused, omitted, delayed, unknown.
- Administration history.
- Medication timeline integration.
- Duplicate submission protection.
Acceptance:
- order does not imply administration;
- planned dose is not auto-marked taken;
- omitted dose does not create a taken event;
- actual event retains snapshot of medication details;
- retry does not duplicate administration.

## Phase 5 – Timeline and clinical notes (+ full symptom diary)
- unified timeline query/service;
- filters, date grouping, pagination;
- notes: `DIARY` | `VISIT_SUMMARY` | `MEDICATION_NOTE` | `RESULT_NOTE` | `CARE_NOTE` | `OTHER`;
- SymptomEntry + configurable diary scales (mood, anxiety, energy…);
- correction workflow (update in place + AuditEvent).
Acceptance:
- every supported event appears once;
- sorting by occurredAt;
- recordedAt remains available;
- correction preserves prior value and creates audit event;
- diary scales work (enable/disable + record).

## Phase 6 – Dashboard and quick add
- latest values;
- medication summary;
- recent events;
- trend charts;
- unified quick-add command sheet.
Acceptance:
- all primary actions <= 2 interactions;
- dashboard has useful empty states;
- no diagnostic/health score.

## Phase 7 – PWA and mobile hardening
- manifest, icons, service worker.
- cache only static assets/app shell.
- no API/private document caching.
- offline indicator and failed-save state.
- iOS standalone testing and safe areas.
Acceptance:
- install to iPhone home screen;
- app shell opens;
- if server unavailable, app clearly states records cannot be saved;
- no false “saved” state;
- no private data in Cache Storage.

## Phase 8 – Export, documents and backup
- CSV and JSON export.
- PDF report.
- private document storage.
- backup and restore.
- backup encryption.
Acceptance:
- export includes date range, time zone and generation timestamp;
- backup includes DB and documents;
- restore test passes in clean environment;
- unauthorized download blocked.

## Phase 9 – Later modules
- laboratory panels/results;
- fluid balance;
- procedures;
- encounters/hospitalization;
- more patient profiles;
- caregiver/read-only roles;
- optional import formats.
Do not start until MVP phases 1–8 are stable.

## Test matrix

### Unit
- Zod schemas;
- dose/value validation;
- time zone and daylight-saving transitions;
- unit conversions;
- timeline event mapping;
- medication status transitions;
- audit correction.

### Integration
- Prisma repository with PostgreSQL;
- foreign-key patient isolation;
- transactions with audit event;
- document authorization;
- idempotency key behavior;
- backup/restore.

### E2E
1. first-run setup and login;
2. create patient profile;
3. add blood pressure and pulse;
4. add custom observation;
5. create medication order;
6. record taken dose;
7. record omitted dose;
8. confirm omitted dose is not displayed as taken;
9. add symptom/note;
10. filter timeline;
11. export records;
12. logout and confirm protected access.

### Responsive / browser
- Desktop Chromium;
- Desktop Safari if available;
- iPhone Safari;
- installed iOS PWA;
- 320px width;
- portrait and landscape;
- keyboard open;
- dark and light themes.

## Definition of Done
- Acceptance criteria pass.
- Lint, typecheck and tests pass.
- No sensitive data in logs.
- No broken mobile layout.
- All forms have loading/success/error states.
- All persisted mutations have server confirmation.
- Docs updated with any architectural change.
