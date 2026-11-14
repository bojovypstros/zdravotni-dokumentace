# Personal Clinical Record

Lokální, multi-device osobní zdravotní záznamník inspirovaný nemocničním informačním systémem (NIS/EHR).

## Produktové rozhodnutí
- Jeden pacient v MVP; datový model od začátku podporuje více pacientů.
- Desktop a iPhone jsou rovnocenné cílové platformy.
- Hybridní vizuální směr: klinická informační hustota + moderní, přístupné UI.
- Local-first: jedna lokální instance serveru a databáze, přístup přes LAN.
- Žádná povinná cloudová služba, analytika, telemetrie ani odesílání zdravotních údajů třetím stranám.

## Dokumentace
- `docs/PRD.md` – produktové požadavky a rozsah.
- `docs/ARCHITECTURE.md` – technická architektura, stack, bezpečnost a provoz.
- `docs/DATA_MODEL.md` – relační datový model a pravidla integrity.
- `docs/UX_UI_SPEC.md` – informační architektura, design system a responzivní UX.
- `docs/IMPLEMENTATION_PLAN.md` – pořadí implementace, akceptační kritéria a testování.
- `.cursor/rules/project.mdc` – trvalé instrukce pro Cursor.

## Startovní instrukce pro Cursor
1. Přečti všechny dokumenty v `docs/` a `.cursor/rules/project.mdc`.
2. Nezačínej generovat celý produkt najednou.
3. Nejdříve vytvoř plán, navrhni strukturu projektu a identifikuj nejasnosti.
4. Dodržuj implementační fáze v `docs/IMPLEMENTATION_PLAN.md`.
5. Po každé fázi spusť lint, typecheck a testy; oprav všechny chyby před pokračováním.
6. Nevkládej do seed dat skutečné osobní ani zdravotní údaje. Používej zjevně fiktivní data.

## Doporučený stack
Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Radix), Lucide, Recharts, PostgreSQL, Prisma, Zod, pnpm, Docker Compose, PWA.

Verze knihoven vybírej jako aktuální stabilní a kompatibilní v době implementace. Verze zamkni v lockfile; nepoužívej neověřené beta/canary verze.

## Důležité vymezení
Jde o osobní evidenční a organizační nástroj, nikoliv o zdravotnický prostředek, klinický rozhodovací systém ani právně vedenou zdravotnickou dokumentaci poskytovatele zdravotních služeb. Aplikace nesmí diagnostikovat, doporučovat změny léčby ani nahrazovat pokyny zdravotníka.
