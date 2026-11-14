# Architecture – Personal Clinical Record

## 1. Principy

- Local-first, server-authoritative data.
- Jedna lokální instance backendu a PostgreSQL pro všechna zařízení.
- Modular monolith; žádné microservices v MVP.
- Type-safe end-to-end: TypeScript + Zod + Prisma.
- Klinické entity oddělené od prezentační vrstvy.
- Auditovatelná historie a explicitní čas události vs čas zápisu.
- FHIR-inspired datové koncepty; nejde o plnou FHIR implementaci.
- Privacy by default: žádná telemetrie ani externí závislosti při běhu.

## 2. Doporučený stack

- Next.js App Router + React + TypeScript.
- Tailwind CSS.
- shadcn/ui + Radix UI primitives.
- Lucide icons.
- Recharts pro grafy.
- PostgreSQL.
- Prisma ORM.
- Zod pro validaci vstupů.
- React Hook Form pro formuláře.
- pnpm.
- Docker Compose pro aplikaci a databázi.
- PWA manifest + service worker pro cache statického app shellu.

Použít aktuální stabilní kompatibilní verze a zamknout je v `pnpm-lock.yaml`. Vyhnout se beta/canary verzím.

## 3. Topologie

```text
Desktop Browser ─┐
                 ├── HTTPS / LAN ──> Next.js App ──> Domain Services ──> Prisma ──> PostgreSQL
iPhone PWA ──────┘                         │
                                          ├── Auth / Session
                                          ├── Validation (Zod)
                                          ├── Audit Events
                                          ├── File Storage (private volume)
                                          └── Export / Backup
```

Jediný server je autoritou pro zdravotní data. Prohlížeč nesmí mít přímý přístup k PostgreSQL.

## 4. Struktura projektu

```text
src/
  app/
    (auth)/
    (app)/
      overview/
      timeline/
      medications/
      observations/
      symptoms/
      diagnoses/
      documents/
      settings/
    api/
  components/
    app-shell/
    patient/
    timeline/
    medications/
    observations/
    charts/
    forms/
    ui/
  features/
    patient/
    medication/
    observation/
    timeline/
    symptom/
    diagnosis/
    document/
    export/
    audit/
  lib/
    auth/
    db/
    validation/
    dates/
    units/
    security/
  server/
    services/
    repositories/
    queries/
prisma/
  schema.prisma
  migrations/
  seed.ts
storage/
  documents/  # private, outside public/
  backups/    # private
```

Dodržet oddělení:
- UI komponenty nevykonávají přímé databázové operace.
- Server actions / route handlers validují vstupy Zod schématy.
- Domain service obsahuje pravidla a transakce.
- Repository/Prisma vrstva provádí persistenci.
- Žádná klinická logika pouze ve frontend komponentě.

## 5. Databáze

PostgreSQL jako jediný zdroj pravdy. Všechny klinické entity mají `patientId`. Použít UUID primární klíče. FK, indexy a unikátní omezení definovat explicitně.

Důležitá pravidla:
- Čas události (`occurredAt`) a čas vytvoření (`createdAt`) jsou oddělené.
- Ukládat `occurredAt` jako UTC timestamptz a pacientské zobrazení v nastaveném IANA time zone.
- Ukládat původní hodnotu/jednotku měření; konverze pro zobrazení nesmí ztratit původní vstup.
- Ordinace a skutečné podání jsou oddělené entity.
- Historické záznamy se nemažou běžným UI; opravy jsou auditované.
- Soft delete pouze pro konfigurační nebo omylem vytvořené drafty; klinické události se opravují korekčním záznamem.
- Všechny mutace klinických záznamů vytváří AuditEvent v jedné DB transakci.

## 6. API a validace

Použít server actions nebo REST route handlers konzistentně. Doporučení: REST-like route handlers pro explicitní doménové zdroje, server components pro čtení.

Příklady:
- `GET/POST /api/patients`
- `GET/PATCH /api/patients/:id`
- `GET/POST /api/medication-orders`
- `GET/POST /api/medication-administrations`
- `GET/POST /api/observations`
- `GET /api/timeline`
- `POST /api/documents`
- `GET /api/exports/...`

Každý mutační endpoint:
1. ověří session a oprávnění;
2. validuje vstup přes Zod;
3. ověří vazby patientId;
4. vykoná transakci;
5. vytvoří auditní událost;
6. vrátí normalizovaný DTO bez interních citlivých údajů.

## 7. PWA a offline chování

- PWA manifest s názvem, ikonami, theme color a `display: standalone`.
- Service worker cache pouze verzovaných statických assetů a bezpečných navigačních shellů.
- Necachovat authenticated API responses, HTML s pacientskými daty, exporty ani dokumenty v Cache Storage.
- Žádné zdravotní záznamy do localStorage.
- IndexedDB může v pozdější fázi držet pouze rozpracovaný koncept formuláře, nikoliv potvrzené záznamy, pokud není zavedena bezpečná šifrovaná offline fronta.
- V MVP při výpadku spojení jasně zobrazit „Server nedostupný – záznam nebyl uložen“.
- Nezobrazovat falešný stav „uloženo“ před potvrzením serverem.
- Při přerušení requestu ověřit výsledek opětovným načtením; idempotency key pro mutace zabrání duplicitnímu zápisu při opakování.

## 8. Autentizace a síť

- Jediný lokální admin účet v MVP.
- Argon2id password hash.
- Ochrana přihlášení rate limitingem a dočasným zpožděním.
- Session cookie: HttpOnly, SameSite=Lax/Strict dle flow, Secure při HTTPS, rotace session ID.
- CSRF token pro mutace, které používají cookie autentizaci.
- Ověřit origin/host header a nepovolit nečekané hosty.
- Default bind na `127.0.0.1`; LAN bind musí být explicitní volba/config.
- Pro přístup z iPhonu doporučit HTTPS v lokální síti s důvěryhodným certifikátem. Nevyzývat uživatele k ignorování TLS varování.
- Nepodporovat veřejný reverse proxy deployment jako default.
- Pokud je app vystavena přes reverse proxy, explicitně dokumentovat trusted proxy a secure cookie konfiguraci.

## 9. Souborové úložiště

- Dokumenty mimo `public/`.
- Náhodné serverové názvy souborů; původní název pouze metadata.
- Kontrola MIME type i přípony; limit velikosti konfigurovatelný.
- Nepovolovat spustitelné soubory.
- Stažení přes autorizovaný endpoint.
- Ochrana proti path traversal.
- Zálohovat DB i soubory jako jeden konzistentní snapshot.

## 10. Zálohy

- Manuální export zálohy z UI.
- CLI skript pro automatizovanou lokální zálohu.
- PostgreSQL dump + archiv souborů + manifest/verze schématu.
- Šifrovat zálohu před uložením mimo host.
- Ověřit checksum a možnost testovací obnovy.
- Nikdy netvrdit, že záloha proběhla, dokud proces neskončí úspěšně.
- Zálohy nesmí být veřejně servírované.

## 11. Logování a audit

Aplikační logy:
- technické chyby, request ID, endpoint, status, latence;
- žádné hodnoty měření, názvy léků, symptomy, poznámky, dokumenty ani přihlašovací údaje.

Auditní log:
- actor, patientId, entityType, entityId, action, timestamp, reason, before/after snapshot nebo bezpečný diff.
- Přístup pouze autorizovanému vlastníkovi.
- Opravy a archivace klinických údajů musí být dohledatelné.

## 12. Testování

- Unit testy doménových služeb, časových funkcí, převodů jednotek a validace.
- Integration testy s PostgreSQL.
- E2E testy hlavních toků přes Playwright.
- Testovat Safari/iOS reálné chování PWA, formulářů, viewportu a klávesnice.
- Testovat obnovu zálohy.
- Testovat, že unauthenticated request nedostane žádné klinické údaje.
- Testovat, že API responses s pacientskými daty nejsou cacheované service workerem.
- Testovat idempotency a duplicitní podání.
