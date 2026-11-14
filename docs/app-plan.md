# Implementační plán – Zdravotní dokumentace (Personal Clinical Record)

**Zdroj pravdy:** `main` repozitáře [bojovypstros/zdravotni-dokumentace](https://github.com/bojovypstros/zdravotni-dokumentace)  
**Datum plánu:** 2026-11-14 (Gate + research lock 2026-11-14)  
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
| 2 | Postgres / HTTPS | Existující Postgres na serveru; DB **`health`**, user **`health`**; heslo jen v serverovém `.env` (z `.env.example`); **veřejné HTTPS ano** (cert řeší Matěj) |
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

### Research lock (Matěj potvrdil 2026-11-14)

| Téma | Potvrzení |
|------|-----------|
| Kontakt Patient | **phone** (+ typ), **email**, **emergency contact**; **address volitelně** |
| Oslovení | **`preferredName`** + CZ **`addressForm`** (+ titles / custom) |
| Hmotnost | **`defaultWeightKg`** odděleně od Observation historie |
| ClinicalNote types | `DIARY`, `VISIT_SUMMARY`, `MEDICATION_NOTE`, `RESULT_NOTE`, `CARE_NOTE`, `OTHER` |
| Přílohy PoC | `pdf` / `jpeg` / `png`, max **10 MiB** |
| SameSite | **`Lax`** (už v Gate / `.env.example`) |
| Alergie | **`noKnownAllergies=yes`** (explicitní flag) |
| First-run | **wizard + env bootstrap** |
| Záloha PoC | šifrování **heslem uživatele** |
| Unit testy | **best practice** developera (Vitest preferován jako běžný výchozí) |
| Server `.env` | **vyplněno** Matějem (nečíst / netisknout secrets) |

**Gate cleared** + **go Matěj (2026-11-14)** → Fáze 1 foundation běží. DB name/user `health`/`health` potvrzeny; serverové `.env` filled. Postgres role/DB `health` vytvořeny Matějem; migrate + seed hotové; `/api/health` = up.

---

## 3. Fáze / milníky a paralelizace

Fáze 1–8 vycházejí z `docs/IMPLEMENTATION_PLAN.md`, upravené Gate decisions. Po každé fázi: `pnpm lint`, `pnpm typecheck`, relevantní testy; žádná další fáze při chybách. Seed jen fiktivní data. **1 zásah z promptu = 1 commit na `main`.**

### Fáze 0 – Gate — **DONE** (research lock DONE; go received)
- Open questions zodpovězeny (viz §2 + §6 vyřešeno); zbývá jen provozní Postgres host/migrate (§6) + vytvoření role/DB na serveru.
- Working agreement: 1 prompt změna = 1 git commit na `main`; sync na combat-server dle Project prefs / `DEPLOY.md`.

### Fáze 1 – Foundation — **DONE** (akceptace DB + shell)
- Init Next.js App Router + TS + pnpm; Tailwind + shadcn/ui; design tokeny **light + dark**; app shell (sidebar / bottom nav); Prisma proti **existujícímu Postgres** (Compose app volitelně / pro local dev — produkční DB na serveru spravuje Matěj); health check; nginx example = reverse-proxy na Next.
- **Akceptace:** lokální start, shell desktop/iPhone, light/dark, DB connection, bez reálných zdravotních dat v seedu.
- **Stav (2026-11-14):** scaffold + shell + tokeny + health + Prisma. Matěj vytvořil role/DB `health`; `prisma migrate deploy` + fiktivní seed OK; `/api/health` → `database: up`. Compose: profil `local-db` na **5433** (bez konfliktu s host 5432). Live nginx beze změny.

**Paralelní workstreamy (po skeletonu repo):**
| ID | Workstream | Závisí na |
|----|------------|-----------|
| 1A | Scaffold Next/pnpm/Tailwind/shadcn | — |
| 1B | Prisma + Postgres connection (local Compose a/nebo remote URL) | — (merge kontrakt s 1A) |
| 1C | App shell + tokeny + dark mode + breakpoints/safe-area | 1A |
| 1D | Health endpoint + CI lint/typecheck skripty + nginx reverse-proxy template | 1A+1B |

### Fáze 2 – Auth + pacientský profil — **DONE** (2026-11-14)
- First-run admin; Argon2id; session + protected routes; Patient CRUD včetně **kontaktních údajů** (phone+typ, email, emergency; address volitelně), **`preferredName` + `addressForm` (+ titles/custom)**, **`defaultWeightKg`**; základní Diagnosis/Allergy včetně **`noKnownAllergies`**; **User/Account** entita; AuditEvent infrastruktura (připravená na before/after).
- **Akceptace:** žádná patient API bez auth; cookie flags (`SameSite=Lax`); unknown allergy ≠ „bez alergií“ (`noKnownAllergies`).
- **Stav:** setup wizard + env bootstrap check; session cookie `zd_session` (HttpOnly, SameSite=Lax, Secure přes `X-Forwarded-Proto`/HTTPS); CSRF na mutacích; rate-limit login/setup; Patient/Diagnosis/Allergy API + UI (Nastavení / Diagnózy); AuditEvent v transakci.

**Paralelní workstreamy:**
| ID | Workstream | Závisí na |
|----|------------|-----------|
| 2A | Auth/session/CSRF/rate-limit login + User/Account | Fáze 1 |
| 2B | Patient (+ kontakt/osloveni/hmotnost) + Diagnosis + Allergy CRUD + UI | 2A (API) / shell |
| 2C | AuditEvent transakční infrastruktura (before/after) | 1B Prisma |

### Fáze 3 – Observations (vitály) — **DONE** (2026-11-14)
- ObservationDefinition katalog + custom; add/edit/correct (**in-place + AuditEvent**); BP pár; jednotky; tabulka + Recharts; timeline hook.
- **Akceptace:** BP, tep, teplota, SpO₂; custom; TZ OK; žádná interpolace.
- **Stav:** systémový katalog (seed); CRUD `/api/observations` + `/api/observation-definitions`; korekce = update + AuditEvent; UI Vitální funkce (tabulka/graf, Europe/Prague); `listTimelineEvents` hook + `/api/timeline` (zatím observations); Recharts `connectNulls={false}`.

**Paralelní:** 3A definitions/seed katalog ‖ 3B observation service/API ‖ 3C charts/table UI (po API kontraktech).

### Fáze 4 – Medikace — **DONE** (2026-11-14)
- MedicationOrder CRUD; MedicationAdministration (taken/partially_taken/refused/omitted/delayed/unknown); snapshot; idempotency; timeline; korekce in-place + audit.
- **Akceptace:** ordinace ≠ podání; žádné auto-taken; omitted ≠ taken; retry neduplikuje.
- **Stav:** Prisma + migrate; API `/api/medication-orders`, `/api/medication-administrations`; UI Medikace (Aktivní/Historie/Podání); timeline hook rozšířen o `medication_administration`; seed fiktivní Paralen + taken/omitted.

**Paralelní:** 4A Order ‖ 4B Administration + idempotency ‖ 4C UI (závisí na API).

### Fáze 5 – Timeline + clinical notes + **plný symptom deník**
- Unified timeline query; filtry, grouping, stránkování; ClinicalNote typy (**`DIARY` \| `VISIT_SUMMARY` \| `MEDICATION_NOTE` \| `RESULT_NOTE` \| `CARE_NOTE` \| `OTHER`**); correction = update in place + AuditEvent.
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
- CSV/JSON export; PDF výpis; private document storage **pro účely backup/export** (bez plné nav agendy Dokumenty); allowlist **pdf/jpeg/png**, max **10 MiB**/soubor; backup+restore+encryption (**PoC: heslo uživatele**).
- **Akceptace:** metadata exportu; backup = DB + soubory dokumentů pokud existují; restore test; unauthorized download blocked.

**Paralelní:** 8A export CSV/JSON/PDF ‖ 8B document storage (support) ‖ 8C backup/restore.

### Fáze 9 – Later (až po stabilním MVP 1–8)
- Plné lab panely/výsledky; fluid balance UI; procedures; encounters; import; případně plná agenda Dokumenty.
- **Více pacientů / kartotéka / role kliniky** → **ne zde** — viz **Fáze 10 (FINAL)**. Caregiver/read-only a další RBAC zůstávají otevřené (Matěj doplní při review).

### Fáze 10 – FINAL – režim „standardní“ (klinika / kartotéka) — **až po MVP 1–8 (+ případně 9)**
Post-MVP režim po stabilizaci osobního záznamníku. **Záměrně nedokončený plán** — Matěj doplní detaily při review běžící appky; **nevymýšlet** RBAC ani clinic UX nad rámec níže.

**Locked (Matěj):**
- Po současných fázích (na konci plánu): režim **„standardní“**.
- **admin** = **vrchní lékař**.
- **lékař** = vidí pacienty (pracuje s pacientskými záznamy).
- **pacient nemá vlastní účet** (žádný patient login / self-service účet).
- Zavést **kartotéku** — **více pacientů je povinné** (ne MVP single-patient).

**Placeholder / open (doplní Matěj později — neimplementovat odhadem):**
- [ ] Přesný rozdíl oprávnění **vrchní lékař** vs **lékař** (co smí admin navíc kromě označení).
- [ ] Kompletní RBAC matice (create/edit/correct/export/backup, viditelnost napříč kartotékou, …) — **zatím neinventovat**.
- [ ] UX kartotéky (seznam, vyhledávání, aktivní pacient / context switch, prázdné stavy).
- [ ] Přepínání / koexistence režimu osobní evidence (MVP) vs **„standardní“** (migrace dat, feature flags, first-run).
- [ ] Vztah k Fázi 9 položkám (lab, encounters, dokumenty, …) v clinic kontextu.
- [ ] Audit / actor model při více lékařských účtech.
- [ ] Další role, organizace, nebo provozní omezení — **TBD při review**.

**Akceptace (minimální, až budou detaily locked):** kartotéka s ≥2 pacienty; účty jen personál (admin=vrchní lékař, lékař); žádný patient account; zbývající body až po Matějově review.

**Paralelní:** neplánovat workstreamy, dokud Matěj neuzavře placeholdery výše.

### Doporučené pořadí agentů (koordinátor)
1. ~~Gate Q → Matěj~~ **DONE**
2. ~~Research lock (kontakt, notes, přílohy, …) → Matěj~~ **DONE**
3. Doplnit DATA_MODEL follow-upy (§5) — krátký docs commit dle locked polí (§2 research)
4. ~~Fáze 1 foundation~~ **DONE** — migrate/seed OK; `/api/health` database up
5. ~~Fáze 2~~ **DONE** — auth + patient/diagnosis/allergy + audit
6. ~~Fáze 3~~ **DONE** — observations/vitals + timeline hook
7. ~~Fáze 4~~ **DONE** — medication orders/administrations + timeline; start Fáze 5
8. Fáze 5 (po 3+4) — včetně plného symptom deníku + locked ClinicalNote types
9. Fáze 6 (quick-add včetně viditelných lab/tekutiny roadmap položek)
10. Fáze 7 ‖ příprava 8A/8B kontraktů
11. Fáze 8 (přílohy pdf/jpeg/png ≤10 MiB; backup PoC = user password)
12. E2E matrix z IMPLEMENTATION_PLAN
13. **Fáze 10 FINAL „standardní“** — až po MVP; nejdřív Matěj doplní placeholdery (§3 Fáze 10 / §6); **neimplementovat** předtím

**Projektové provozní omezení:**
- Každý zásah z promptu = **jeden** Git commit na **`main`** (bez povinného PR).
- Sync checkoutu na combat-server: `/var/webserver/health.combatostrich.dev` (cron 5 min + `scripts/pull-main.sh`).
- Nginx/SSL vlastní Matěj; v repu jen reverse-proxy šablona — **agents nemění live nginx**.
- Public repo; žádná reálná zdravotní data v gitu; **nečíst / netisknout** serverové `.env` secrets.
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

### Potvrzeno (env / session / DB / data locks)
- Postgres: databáze **`health`**, user **`health`**; heslo pouze v serverovém `.env` (šablona `.env.example` v kořeni repa) — ne v gitu; **serverové `.env` vyplněno** (2026-11-14).
- Session cookie: **SameSite=Lax** (HttpOnly; Secure na HTTPS).
- First-run: **wizard + env bootstrap**.
- Veřejná URL: `https://health.combatostrich.dev`.
- Patient kontakt: phone (+ type), email, emergency contact; address optional.
- Oslovení: `preferredName` + CZ `addressForm` (+ titles/custom).
- `defaultWeightKg` odděleně od Observation historie.
- Allergy: explicitní `noKnownAllergies`.
- ClinicalNote types: `DIARY`, `VISIT_SUMMARY`, `MEDICATION_NOTE`, `RESULT_NOTE`, `CARE_NOTE`, `OTHER`.
- Přílohy PoC: MIME `application/pdf`, `image/jpeg`, `image/png`; max **10 MiB**.
- Záloha PoC: šifrování heslem uživatele.
- Unit testy: best practice (např. Vitest).

### Neuvedeno / otevřené
Viz §6: Postgres host/TLS a migrate oprávnění (neblokuje Fázi 1 skeleton po coordinator go).

---

## 5. Rizika / mezery / follow-up (po Gate + research lock)

### Vyřešeno Gate
- ~~Local-first vs combat-server~~ → produkce = full app na `health.combatostrich.dev` + existující Postgres; public HTTPS.
- ~~Symptom rozsah~~ → plný deník + škály v MVP.
- ~~Dokumenty nav~~ → jen backup/export.
- ~~Dark mode timing~~ → Fáze 1.
- ~~Korekce model~~ → in-place + AuditEvent before/after.
- ~~Lab/tekutiny quick-add~~ → zobrazit, neskrývat (roadmap/available).
- ~~`.cursor/rules/project.mdc`~~ → vytvořit.
- ~~Plán v gitu / commits na main~~ → ano.

### Vyřešeno research lock (Matěj 2026-11-14)
- ~~Kontaktní pole / oslovení / hmotnost tvar~~ → viz §2 research lock.
- ~~ClinicalNote types~~ → 6 enum hodnot výše.
- ~~Přílohy MIME/size~~ → pdf/jpeg/png, 10 MiB.
- ~~SameSite~~ → Lax.
- ~~`noKnownAllergies`~~ → ano.
- ~~First-run / backup PoC / unit tests~~ → wizard+env; user password; best practice.

### Zůstává – DATA_MODEL follow-up (ne přepisovat celý dokument bez schválení)
Krátké úkoly pro samostatný docs commit (koordinátor):

1. **Patient:** zapsat locked pole — phone (+ type), email, emergency contact; address optional; `preferredName` + `addressForm` (+ titles/custom); `defaultWeightKg` (ne Observation).
2. **User/Account:** nová sekce entity (id, credentials/hash, role admin MVP, vazba na Patient / actorId pro AuditEvent).
3. **SymptomEntry / škály:** rozšířit model o konfigurovatelné deníkové škály (nálada, úzkost, energie…) — aktuální `SymptomEntry` je příliš jednoduchý.
4. **Korekce wording:** ARCHITECTURE §5 říká „korekční záznam“; Gate = update in place + audit — sjednotit formulaci v ARCHITECTURE/DATA_MODEL (integrity rules + AuditEvent before/after).
5. **Allergy:** přidat explicitní `noKnownAllergies`.
6. **ClinicalNote.type:** enum `DIARY` \| `VISIT_SUMMARY` \| `MEDICATION_NOTE` \| `RESULT_NOTE` \| `CARE_NOTE` \| `OTHER`.
7. **Document / attachment PoC:** allowlist pdf/jpeg/png, max 10 MiB (pro Fázi 8).

### Stále relevantní rizika
- **Public repo + citlivá data:** seed/fixtures/logs/backups v gitu bez reálných dat; runtime data jen na serveru mimo git; **nikdy netisknout** `.env` secrets.
- **Trusted proxy / Secure cookies:** při veřejném HTTPS reverse-proxy nutná dokumentace trusted proxy (ARCHITECTURE §8).
- **Compose vs remote Postgres:** local Compose může zůstat pro vývoj; produkční connection string směřuje na serverovou DB vytvořenou Matějem.

---

## 6. Open questions — zbývá / vyřešeno

### Vyřešeno (2026-11-14, Matěj — Gate + research)
- ~~DB name/user~~ → databáze **`health`**, user **`health`**; heslo v serverovém `.env` dle `.env.example`; **`.env` na serveru vyplněno**.
- ~~Session SameSite~~ → **`Lax`**.
- ~~First-run~~ → **wizard + env bootstrap**.
- ~~Kontaktní pole Patient~~ → phone (+ type), email, emergency contact; address optional.
- ~~Preferované oslovení~~ → `preferredName` + CZ `addressForm` (+ titles/custom).
- ~~Výchozí hmotnost~~ → `defaultWeightKg` odděleně od Observation historie.
- ~~`noKnownAllergies`~~ → **ano**.
- ~~Záloha PoC~~ → šifrování **heslem uživatele**.
- ~~MIME / size příloh~~ → pdf/jpeg/png, max **10 MiB**.
- ~~Unit test runner~~ → **best practice** (Vitest OK).
- ~~ClinicalNote types MVP~~ → `DIARY`, `VISIT_SUMMARY`, `MEDICATION_NOTE`, `RESULT_NOTE`, `CARE_NOTE`, `OTHER`.

### Provoz / DB (zbývá — neblokuje Fázi 1 skeleton po go)
1. Zda app smí `CREATE`/`ALTER` přes Prisma migrate, nebo migrace jen Matěj.
2. Connection: host/socket, port, TLS k Postgres — cokoliv nestandardního na combat-serveru? (v `.env.example` placeholder `localhost` / docker síť; produkční hodnoty jen v serverovém `.env`).

### Fáze 10 – režim „standardní“ / kartotéka (zbývá — Matěj při review appky)
Locked zatím jen: režim **„standardní“** na konci; **admin = vrchní lékař**; **lékař** vidí pacienty; **pacient bez vlastního účtu**; **kartotéka = více pacientů povinně**. Detaily RBAC/UX/migrace režimů — viz placeholdery u Fáze 10; **nevymýšlet**.

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
| Research `docs/research-patient-contact-and-notes.md` (store) | potvrzeno Matějem 2026-11-14 → §2 research lock |

**Stav:** Fáze 1–4 **DONE** (auth + patient + observations/vitals + medikace + timeline hook); **Fáze 10 FINAL** (režim „standardní“ / kartotéka) zapsána jako post-MVP placeholder; plán syncovaný; secrets jen v serverovém `.env`; live nginx beze změny (šablona má cookie/proxy poznámku).
