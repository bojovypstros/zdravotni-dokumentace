# UX/UI Specification – Personal Clinical Record

## 1. Design direction: Hybrid Clinical

Kombinace:
- klinická informační hustota a hierarchie nemocničního systému;
- moderní typografie, spacing, formulářové komponenty a grafy;
- decentní barevnost, žádné wellness pastelové karty;
- vysoká čitelnost, rychlé skenování a předvídatelné ovládání.

## 2. Design tokens

Navržené výchozí tokeny (lze doladit po prvním vizuálním prototypu):

### Light
- app background: `#F3F6F9`
- surface: `#FFFFFF`
- surface-muted: `#EAF0F5`
- sidebar: `#172B43`
- sidebar text: `#D8E3ED`
- primary: `#167C80` (tlumená teal)
- primary-hover: `#11686C`
- text: `#172536`
- text-muted: `#617184`
- border: `#D9E1E8`
- success: `#23845B`
- warning: `#B7791F`
- danger: `#B83A45`
- info: `#3674A8`

### Dark
- app background: `#101923`
- surface: `#172330`
- surface-muted: `#202F3E`
- sidebar: `#0D1824`
- primary: `#58BFC0`
- text: `#E7EEF5`
- text-muted: `#A6B5C4`
- border: `#304252`

Status colors must always be accompanied by text/icon; never rely on color alone.

## 3. Typography and density
- UI font: system font stack; bundle local font only if licensed and required.
- Body 14–16px; dense table cells 13–14px.
- Page title 22–28px desktop, 20–24px mobile.
- Numeric clinical values use tabular numerals.
- Use consistent date/time format `14. 11. 2026, 13:25`.
- Clinical tables may be compact, but never sacrifice legibility.
- Provide Comfortable / Compact density setting.

## 4. Desktop shell

At >= 1024px:
- fixed/collapsible left sidebar, approx 240px expanded / 72px collapsed;
- top bar with patient switcher (future), global search, quick-add, profile/settings;
- patient context header;
- main content area;
- optional right contextual drawer for detail/edit.
- Keep primary actions visible without excessive scrolling.

## 5. Mobile shell

At < 768px:
- no permanent desktop sidebar;
- compact top header with page title and patient context;
- bottom navigation for 4–5 main destinations: Přehled, Časová osa, Medikace, Měření, Více;
- floating or prominent quick-add action;
- forms use full-screen sheet/page rather than narrow desktop dialogs;
- controls at least 44x44 CSS px target where practical;
- no hover-only actions;
- support iOS safe areas and on-screen keyboard;
- use native date/time inputs where reliable, with custom fallback;
- tables become stacked cards or carefully designed horizontal scroll with sticky first column where a 2D table is essential.

## 6. Core screens

### Overview
- patient identity header and profile summary;
- allergy banner only when known allergy exists; distinguish unknown status;
- active medication summary;
- latest vital measurements;
- trend mini-charts;
- recent timeline;
- quick actions.

### Timeline / Dekurz
- date grouping;
- compact event rows with icon, category, event time, title, summary, author/source;
- filters by event type and date range;
- event detail side panel on desktop and full-screen detail on mobile;
- distinguish occurredAt from recordedAt where different;
- correction indicator if event has been amended.

### Medication
- tabs: Aktivní, Historie, Plán (if scheduled regimen exists);
- medication rows show name, strength, form, regimen and status;
- detail view contains instructions, source, dates and administration history;
- clear action “Zaznamenat užití”;
- planned dose and actual administration visually distinct;
- no one-tap accidental confirmation: confirm actual dose and time before saving.

### Vital signs
- metric selector;
- date range: 24 h / 7 d / 30 d / 90 d / custom;
- chart + table toggle;
- add measurement action;
- show units, measurement time and context;
- allow multiple values in one entry (e.g. BP + pulse);
- show user-configured threshold labels as user settings, not medical diagnosis.

### Quick add
A unified command sheet:
- Měření
- Užití léku
- Symptom
- Poznámka
- Laboratorní výsledek
- Tekutiny (future)

### Patient profile
- demographics;
- allergies;
- diagnoses;
- history;
- emergency summary export (later).

## 7. Interaction rules
- Common actions <= 2 interactions from any main screen.
- Autosave only for drafts; committed clinical records require explicit Save.
- Always show save state: saving / saved / failed.
- Preserve form content on validation error.
- Use inline validation with Czech messages.
- Confirmation for destructive or irreversible actions.
- Avoid modal nesting.
- Use keyboard shortcuts only when focus is not inside editable fields.
- Provide empty states with a clear next action.
- Use skeletons only for genuine loading; no fake analytics.

## 8. Charts
- Recharts with accessible labels and table alternative.
- No chart should imply diagnosis.
- Display units and actual observation timestamps.
- Do not interpolate missing clinical data as if measured.
- Outliers remain visible; do not silently clip.
- Mobile charts support touch tooltip and adequate height.
- For blood pressure show systolic/diastolic distinctly.

## 9. Accessibility
Target WCAG 2.2 AA:
- semantic HTML;
- visible focus;
- keyboard navigation;
- sufficient contrast;
- labels and error descriptions;
- no color-only status;
- reflow at 320 CSS px;
- respect reduced motion;
- chart data available in table form;
- touch target 44px goal.

## 10. Visual QA
Create screenshot fixtures for:
- 1440px desktop;
- 1024px tablet/small laptop;
- 390px iPhone viewport;
- 320px narrow viewport;
- light and dark themes;
- empty, populated, loading, error and long-data states.
