# Personal Clinical Record

Lokální, multi-device osobní zdravotní záznamník inspirovaný nemocničním informačním systémem (NIS/EHR).

## Produktové rozhodnutí
- Jeden pacient v MVP; datový model od začátku podporuje více pacientů.
- Desktop a iPhone jsou rovnocenné cílové platformy.
- Hybridní visuální směr: klinická informační hustota + moderní, přístupné UI.
- Local-first: jedna lokální instance serveru a databáze, přístup přes LAN.
- Žádná povinná cloudová služba, analytika, telemetrie ani odesílání zdravotních údajů třetím stranám.

## Dokumentace
- `docs/PRD.md` – produktové požadavky a rozsah.
- `docs/ARCHITECTURE.md` – technická architektura, stack, bezpečnost a provoz.
- `docs/DATA_MODEL.md` – relační datový model a pravidla integrity.
- `docs/UX_UI_SPEC.md` – informační architektura, design system a responzivní UX.
- `docs/IMPLEMENTATION_PLAN.md` – pořadí implementace, akceptační kritéria a testování.
- `docs/app-plan.md` – aktuální implementační plán včetně Gate rozhodnutí.
- `.cursor/rules/project.mdc` – trvalé instrukce pro Cursor.
- `DEPLOY.md` – sync na combat-server.

## Stack (Fáze 1)
Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Radix), Lucide, PostgreSQL, Prisma, Zod, pnpm. Docker Compose je volitelný (local-db profil na portu 5433 — nekoliduje s host Postgres 5432).

## Spuštění (vývoj)

```bash
cp .env.example .env   # na serveru už .env existuje — nikdy necommituj secrets
pnpm install
pnpm exec prisma generate
pnpm db:migrate:deploy   # vyžaduje existující DB role/database health
pnpm dev                 # http://127.0.0.1:3000
```

Kontroly:

```bash
pnpm lint
pnpm typecheck
curl -sS http://127.0.0.1:3000/api/health
```

Produkční URL (až poběží Next + nginx): `https://health.combatostrich.dev`.

## Důležité vymezení
Jde o osobní evidenční a organizační nástroj, nikoliv o zdravotnický prostředek, klinický rozhodovací systém ani právně vedenou zdravotnickou dokumentaci poskytovatele zdravotních služeb. Aplikace nesmí diagnostikovat, doporučovat změny léčby ani nahrazovat pokyny zdravotníka.
