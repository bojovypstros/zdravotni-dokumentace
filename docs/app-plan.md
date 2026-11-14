# Implementační plán – Zdravotní dokumentace (Personal Clinical Record)

**Zdroj pravdy:** `main` repozitáře [bojovypstros/zdravotni-dokumentace](https://github.com/bojovypstros/zdravotni-dokumentace)  
**Datum plánu:** 2026-11-14 (Gate decisions 2026-11-14)  
**Jazyk:** čeština (dle dokumentace produktu)  
**Pravidlo:** nic si nevymýšlet — zbývající nejasnosti jen v sekci Open questions (zbývá).

---

## 1. Shrnutí produktu (z docs)

Stavíme **lokální / self-hosted, multi-device osobní zdravotní záznamník** inspirovaný NIS/EHR: strukturovaná evidence zdraví, léků (ordinace ≠ skutečné užití), měření, symptomů, událostí a (později) dokumentů.

- **MVP:** 1 lokální admin účet + 1 aktivní pacient; datový model má `patient_id` všude (více pacientů později).
- **Platformy:** desktop a iPhone rovnocenně; hybridní UI (klinická hustota + moderní, přístupné ovládání); **dark mode od Fáze 1**.
- **Deploy (Gate):** plná app + DB na combat-serveru pod `health.combatostrich.dev`; veřejné HTTPS (cert obstarává Matěj); existující Postgres (Matěj vytvoří DB + roli).
- **Vymezení:** osobní evidence, **ne** zdravotnický prostředek, **ne** klinický decision-support, **ne** právně vedená dokumentace poskytovatele. Aplikace nesmí diagnostikovat ani doporučovat léčbu.
- **MVP navigace (plně):** Přehled, Časová osa, Medikace, Vitální funkce, **Symptomy a deník (včetně škál)**, základní Diagnózy/Alergie. Agenda **Dokumenty v nav není** — dokumenty jen jako součást backup/export.
- **Akceptace MVP (výběr):** profil (+ kontakt / oslovení / výchozí hmotnost); medikace + skutečné/vynechané užití; vitály + vlastní veličina; historie/grafy; **plný symptom deník**; jednotná časová osa; export; záloha/obnova; desktop + iPhone; offline vůči externím službám při dostupném serveru.

---

## 2. Gate – rozhodnutí (autoritativní, 2026-11-14)

| # | Téma | Rozhodnutí |
|---|------|------------|
| 1 | `health.combatostrich.dev` | **(b)** plná app + DB na combat-serveru |
| 2 | Postgres / HTTPS | Existující Postgres na serveru; Matěj vytvoří DB user + database; **veřejné HTTPS ano** (cert řeší Matěj) |
| 3 | Nginx | Šablona v repu **hned** jako reverse-proxy na Next; Matěj si conf nasadí sám |
| 4 | Symptom MVP | **Plný** symptom deník včetně škál |
| 5 | Lab / tekutiny v quick-add | **Neskrývat** — zobrazit; v UI/docs vyjasnit jako available / roadmap (ne fake plná obrazovka) |
| 6 | Dokumenty | Jen **backup/export** prozatím; **bez** nav agendy Dokumenty |
| 7 | Dark mode | Od **Fáze 1** |
| 8 | Patient / User | Ano: kontakt, preferované oslovení, výchozí hmotnost; definovat **User/Account** v DATA_MODEL |
| 9 | Korekce | **Update in place** + `AuditEvent` before/after |
| 10 | Plán v gitu | Commitovat plán (+ změny) do GitHub `docs/` |
| 11 | Cursor rules | Vytvořit `.cursor/rules/project.mdc` |
| 12 | Git workflow | Commity **přímo na `main`** (bez povinného PR) |
| 13 | Live nginx/SSL | **Agenti nikdy nesahají** — jen šablony v `nginx/` |

Gate **již neblokuje** start Fáze 1 kódu, jakmile jsou dořešeny zbývající Open questions níže (zejm. jméno DB/role).

---

## 3. Fáze / milníky a paralelizace

Fáze 1–8 vycházejí z `docs/IMPLEMENTATION_PLAN.md`, upravené Gate decisions. Po každé fázi: `pnpm lint`, `pnpm typecheck`, relevantní testy; žádná další fáze při chybách. Seed jen fiktivní data. **1 zásah z promptu = 1 commit na `main`.**

### Fáze 0 – Gate — **DONE**
- Open questions zodpovězeny (viz §2); zbývá jen provozní detaily (§6).
- Working agreement: 1 prompt změna = 1 git commit na `main`; sync na combat-server dle Project prefs / `DEPLOY.md`.

### Fáze 1 – Foundation
- Init Next.js App Router + TS + pnpm; Tailwind + shadcn/ui; design tokeny **light + dark**; app shell (sidebar / bottom nav); Prisma proti **existujícímu Postgres** (Compose app volitelně / pro local dev — produkční DB na serveru spravuje Matěj); health check; nginx example = reverse-proxy na Next.
- **Akceptace:** lokální start, shell desktop/iPhone, light/dark, DB connection, bez reálných zdravotních dat v seedu.

**Paralelní workstreamy (po skeletonu repo):**
| ID | Workstream | Závisí na |
|----|------------|-----------|
| 1A | Scaffold Next/pnpm/Tailwind/shadcn | — |
| 1B | Prisma + Postgres connection (local Compose a/nebo remote URL) | — (merge kontrakt s 1A) |
| 1C | App shell + tokeny + dark mode + breakpoints/safe-area | 1A |
| 1D | Health endpoint + CI lint/typecheck skripty + nginx reverse-proxy template | 1A+1B |

### Fáze 2 – Auth + pacientský profil
- First-run admin; Argon2id; session + protected routes; Patient CRUD včetně **kontaktních údajů, preferovaného oslovení, výchozí hmotnosti**; základní Diagnosis/Allergy; **User/Account** entita; AuditEvent infrastruktura (připravená na before/after).
- **Akceptace:** žádná patient API bez auth; cookie flags; unknown allergy ≠ „bez alergií“.

**Paralelní workstreamy:**
| ID | Workstream | Závisí na |
|----|------------|-----------|
| 2A | Auth/session/CSRF/rate-limit login + User/Account | Fáze 1 |
| 2B | Patient (+ kontakt/osloveni/hmotnost) + Diagnosis + Allergy CRUD + UI | 2A (API) / shell |
| 2C | AuditEvent transakční infrastruktura (before/after) | 1B Prisma |

### Fáze 3 – Observations (vitály)
- ObservationDefinition katalog + custom; add/edit/correct (**in-place + AuditEvent**); BP pár; jednotky; tabulka + Recharts; timeline hook.
- **Akceptace:** BP, tep, teplota, SpO₂; custom; TZ OK; žádná interpolace.

**Paralelní:** 3A definitions/seed katalog ‖ 3B observation service/API ‖ 3C charts/table UI (po API kontraktech).

### Fáze 4 – Medikace
- MedicationOrder CRUD; MedicationAdministration (taken/partial/refused/omitted/delayed/unknown); snapshot; idempotency; timeline; korekce in-place + audit.
- **Akceptace:** ordinace ≠ podání; žádné auto-taken; omitted ≠ taken; retry neduplikuje.

**Paralelní:** 4A Order ‖ 4B Administration + idempotency ‖ 4C UI (závisí na API).

### Fáze 5 – Timeline + clinical notes + **plný symptom deník**
- Unified timeline query; filtry, grouping, stránkování; ClinicalNote typy; correction = update in place + AuditEvent.
- **SymptomEntry + škály deníku** (nálada, úzkost, energie… konfigurovatelné) — plný MVP modul, ne jen quick-add řádek.
- **Akceptace:** události jednou v ose; sorting by `occurredAt`; korekce zachová before/after v auditu; deník škál funguje.

**Paralelní:** 5A timeline service ‖ 5B notes/correction ‖ 5C symptom diary + scales.

### Fáze 6 – Dashboard + quick add
- Latest values, med summary, recent events, trend charts, unified quick-add sheet.
- Quick-add položky **Lab** a **Tekutiny** **zobrazit** (neskrývat) s jasným stavem available/roadmap — **ne** plná fake obrazovka Phase 9 modulů.
- **Akceptace:** ≤2 interakce na primární akce; empty states; žádné health score.

**Paralelní:** 6A dashboard widgets ‖ 6B quick-add command sheet.

### Fáze 7 – PWA + mobile hardening
- Manifest, ikony, SW (jen static shell); offline indikátor; iOS standalone/safe areas.
- **Akceptace:** install na iPhone; jasné „nelze uložit“; žádná private data v Cache Storage.

**Paralelní omezeně:** 7A PWA/SW ‖ 7B iOS QA (po 7A).

### Fáze 8 – Export, backup (+ dokumenty bez nav)
- CSV/JSON export; PDF výpis; private document storage **pro účely backup/export** (bez plné nav agendy Dokumenty); backup+restore+encryption.
- **Akceptace:** metadata exportu; backup = DB + soubory dokumentů pokud existují; restore test; unauthorized download blocked.

**Paralelní:** 8A export CSV/JSON/PDF ‖ 8B document storage (support) ‖ 8C backup/restore.

### Fáze 9 – Later (až po stabilním MVP 1–8)
- Plné lab panely/výsledky; fluid balance UI; procedures; encounters; více pacientů; caregiver/read-only; import; případně plná agenda Dokumenty.

### Doporučené pořadí agentů (koordinátor)
1. ~~Gate Q → Matěj~~ **DONE**
2. Doplnit DATA_MODEL follow-upy (§5) — krátký docs commit, pokud koordinátor schválí
3. Fáze 1 (1A+1B paralelně, pak 1C/1D) — **až po DB name/user od Matěje** (nebo s placeholder env + local Compose)
4. Fáze 2
5. Fáze 3 ‖ start Fáze 4 (nezávislé domény po patient/auth)
6. Fáze 5 (po 3+4) — včetně plného symptom deníku
7. Fáze 6 (quick-add včetně viditelných lab/tekutiny roadmap položek)
8. Fáze 7 ‖ příprava 8A/8B kontraktů
9. Fáze 8
10. E2E matrix z IMPLEMENTATION_PLAN

**Projektové provozní omezení:**
- Každý zásah z promptu = **jeden** Git commit na **`main`** (bez povinného PR).
- Sync checkoutu na combat-server: `/var/webserver/health.combatostrich.dev` (cron 5 min + `scripts/pull-main.sh`).
- Nginx/SSL vlastní Matěj; v repu jen reverse-proxy šablona — **agents nemění live nginx**.
- Public repo; žádná reálná zdravotní data v gitu.
- Plán žije v `docs/app-plan.md` (git) i v Project store (sync).

---

## 4. Tech / stack

### Uvedeno v docs (použít)
| Oblast | Volba (README / ARCHITECTURE) |
|--------|-------------------------------|
| App | Next.js App Router, React, TypeScript |
| UI | Tailwind CSS, shadcn/ui (Radix), Lucide, Recharts |
| Formuláře | React Hook Form + Zod |
| DB | PostgreSQL + Prisma (**produkce:** existující instance na combat-serveru) |
| Package | pnpm; verze zamknout v lockfile; aktuální stabilní, ne beta/canary |
| Runtime | Docker Compose pro local/dev; produkce na combat-serveru |
| PWA | manifest + service worker (jen app shell) |
| Auth hash | Argon2id |
| TZ | Europe/Prague default; UTC timestamptz + IANA zone |
| Jazyk UI | čeština (arch. připravená na i18n) |
| Korekce | Update in place + AuditEvent before/after (Gate) |

Struktura `src/` dle ARCHITECTURE (app routes, features, server services/repositories, prisma, private `storage/`). Routes `documents/` v architektuře mohou existovat jako support/export cesty — **bez** hlavní nav agendy Dokumenty v MVP.

### Neuvedeno / otevřené
Viz §6 (zbývající otázky): přesné DB name/user, MIME limity, unit test runner, detaily session/záloh, přesný tvar kontaktních polí.

---

## 5. Rizika / mezery / follow-up (po Gate)

### Vyřešeno Gate
- ~~Local-first vs combat-server~~ → produkce = full app na `health.combatostrich.dev` + existující Postgres; public HTTPS.
- ~~Symptom rozsah~~ → plný deník + škály v MVP.
- ~~Dokumenty nav~~ → jen backup/export.
- ~~Dark mode timing~~ → Fáze 1.
- ~~Korekce model~~ → in-place + AuditEvent before/after.
- ~~Lab/tekutiny quick-add~~ → zobrazit, neskrývat (roadmap/available).
- ~~`.cursor/rules/project.mdc`~~ → vytvořit.
- ~~Plán v gitu / commits na main~~ → ano.

### Zůstává – DATA_MODEL follow-up (ne přepisovat celý dokument bez schválení)
Krátké úkoly pro samostatný docs commit (koordinátor / Matěj):

1. **Patient:** doplnit pole z PRD — kontaktní údaje, preferované oslovení (`preferredAddress` / display form), výchozí hmotnost (`defaultWeightKg` nebo ekvivalent). Přesný tvar polí viz §6 Q1.
2. **User/Account:** nová sekce entity (id, credentials/hash, role admin MVP, vazba na Patient / actorId pro AuditEvent).
3. **SymptomEntry / škály:** rozšířit model o konfigurovatelné deníkové škály (nálada, úzkost, energie…) — aktuální `SymptomEntry` je příliš jednoduchý.
4. **Korekce wording:** ARCHITECTURE §5 říká „korekční záznam“; Gate = update in place + audit — sjednotit formulaci v ARCHITECTURE/DATA_MODEL (integrity rules + AuditEvent before/after).
5. **Allergy:** ověřit explicitní `noKnownAllergies` vs prázdný seznam (viz §6).

### Stále relevantní rizika
- **Public repo + citlivá data:** seed/fixtures/logs/backups v gitu bez reálných dat; runtime data jen na serveru mimo git.
- **Trusted proxy / Secure cookies:** při veřejném HTTPS reverse-proxy nutná dokumentace trusted proxy (ARCHITECTURE §8).
- **Compose vs remote Postgres:** local Compose může zůstat pro vývoj; produkční connection string směřuje na serverovou DB vytvořenou Matějem.

---

## 6. Open questions — zbývá pro Matěje (před / během Fáze 1)

### Provoz / DB (blokuje produkční napojení)
1. **Přesný název databáze a DB role/user** (a zda app smí `CREATE`/`ALTER` přes Prisma migrate, nebo migrace jen Matěj).
2. Connection: host/socket, port, TLS k Postgres — cokoliv nestandardního na combat-serveru?

### Data (neblokuje skeleton; ideálně před Fází 2)
3. Kontaktní pole Patient — přesný seznam? (např. telefon, e-mail, adresa, poznámka ke kontaktu?) Preferované oslovení = free text?
4. Explicitní flag **„žádné známé alergie“** (`noKnownAllergies`) vs. jen prázdný seznam?

### Bezpečnost / provoz app (neblokuje Fázi 1 scaffold)
5. First-run: jen setup wizard, nebo i bootstrap přes env/secrets na serveru?
6. Session SameSite: preference `Lax` vs `Strict`?
7. Záloha: šifrování heslem uživatele vs oddělený recovery key? Formát archivu?
8. **Limit velikosti dokumentů a povolené MIME** — konkrétní čísla?

### Proces / tooling
9. Unit test runner (Vitest / Jest / node:test) — preference, nebo nechat na best practice developera?

### Clinical notes
10. Clinical notes v MVP (Phase 5): potvrdit minimum typů ze spec (subjective / objective / personal assessment / personal plan / general), nebo zúžit?

---

## 7. Definition of Done (z docs — připomínka)

- Akceptace fází + PRD §11 (s Gate úpravami rozsahu).
- Lint, typecheck, testy green.
- Žádná citlivá data v logách / Cache Storage / gitu.
- Mobile layout OK; formuláře: saving/saved/failed; mutace jen po server confirmation.
- Architektonické odchylky zapsat do docs.
- Agenti nemění live nginx/SSL.

---

## 8. Zdroje přečtené pro tento plán

| Soubor | Poznámka |
|--------|----------|
| `README.md` | produkt + startovní instrukce |
| `docs/PRD.md` | rozsah, akceptace |
| `docs/ARCHITECTURE.md` | stack, topologie, security |
| `docs/DATA_MODEL.md` | entity (follow-up mezery §5) |
| `docs/UX_UI_SPEC.md` | IA, quick-add, dark tokens |
| `docs/IMPLEMENTATION_PLAN.md` | fáze 1–9 |
| `docs/REFERENCES.md` | inspirace, ne compliance |
| `DEPLOY.md` | combat-server sync path |
| `nginx/README.md`, `nginx/*.example.conf` | šablony only |
| `scripts/pull-main.sh` | auto-sync |
| Project `notes.md`, `preferences.md` | Gate / provozní prefs |
| Gate answers Matěj | 2026-11-14 (autoritativní §2) |

**Stav:** plán syncovaný do GitHub `docs/app-plan.md`; `.cursor/rules/project.mdc` vytvořen; aplikace zatím neimplementována; live nginx beze změny.
