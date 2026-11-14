/**
 * Czech display labels for enum/slug codes.
 * DB/API keep machine codes; UI and user-facing exports use these labels.
 */

export function csLabel(
  map: Record<string, string>,
  code: string | null | undefined,
  fallback?: string,
): string {
  if (code == null || code === "") return fallback ?? "";
  return map[code] ?? fallback ?? code;
}

export const DIAGNOSIS_STATUS_LABELS: Record<string, string> = {
  active: "aktivní",
  in_remission: "v remisi",
  resolved: "vyléčená",
  unconfirmed: "nepotvrzená",
  historical: "historická",
};

export const ALLERGY_SEVERITY_LABELS: Record<string, string> = {
  mild: "mírná",
  moderate: "střední",
  severe: "těžká",
  unknown: "neznámá",
};

export const ALLERGY_STATUS_LABELS: Record<string, string> = {
  active: "aktivní",
  inactive: "neaktivní",
  unconfirmed: "nepotvrzená",
};

export const ALLERGY_VERIFICATION_LABELS: Record<string, string> = {
  confirmed_by_clinician: "klinicky ověřeno",
  patient_reported: "hlášeno pacientem",
  unknown: "neznámé",
};

export const CLINICAL_NOTE_TYPE_LABELS: Record<string, string> = {
  DIARY: "Deník",
  VISIT_SUMMARY: "Shrnutí návštěvy",
  MEDICATION_NOTE: "Poznámka k lékům",
  RESULT_NOTE: "Poznámka k výsledku",
  CARE_NOTE: "Péče",
  OTHER: "Jiné",
};

export const CLINICAL_NOTE_SOURCE_LABELS: Record<string, string> = {
  manual: "ručně",
  import: "import",
  other: "jiné",
};

export const MEDICATION_ROUTE_LABELS: Record<string, string> = {
  oral: "perorální",
  sublingual: "sublingvální",
  topical: "kožní",
  inhalation: "inhalace",
  injection: "injekční",
  infusion: "infuzní",
  ophthalmic: "oční",
  otic: "ušní",
  rectal: "rektální",
  other: "jiná",
};

export const MEDICATION_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "návrh",
  active: "aktivní",
  paused: "pozastavená",
  completed: "ukončená",
  discontinued: "vysazená",
  cancelled: "zrušená",
};

export const MEDICATION_ADMIN_STATUS_LABELS: Record<string, string> = {
  taken: "užito",
  partially_taken: "částečně",
  refused: "odmítnuto",
  omitted: "vynecháno",
  delayed: "odloženo",
  unknown: "neznámé",
};

export const MEDICATION_REGIMEN_LABELS: Record<string, string> = {
  scheduled: "pravidelný",
  prn: "dle potřeby (PRN)",
  once: "jednorázový",
  course: "kúra",
  other: "jiný",
};

export const MEDICATION_SOURCE_TYPE_LABELS: Record<string, string> = {
  clinician_order: "ordinace lékaře",
  patient_recorded_plan: "plán pacienta",
  historical: "historický",
  other: "jiný",
};

export const ENCOUNTER_TYPE_LABELS: Record<string, string> = {
  hospitalization: "Hospitalizace",
  outpatient: "Ambulantní",
  emergency: "Urgentní",
  self_monitoring: "Vlastní sledování",
  other: "Jiné",
};

export const ENCOUNTER_STATUS_LABELS: Record<string, string> = {
  planned: "plánováno",
  in_progress: "probíhá",
  completed: "ukončeno",
  cancelled: "zrušeno",
};

export const PROCEDURE_STATUS_LABELS: Record<string, string> = {
  planned: "plánováno",
  completed: "provedeno",
  cancelled: "zrušeno",
  unknown: "neznámé",
};

export const LAB_RESULT_FLAG_LABELS: Record<string, string> = {
  low: "Nízká",
  high: "Vysoká",
  normal: "V normě",
  abnormal_unspecified: "Abnormální",
  unknown: "Neznámá",
};

export const LAB_ORDER_STATUS_LABELS: Record<string, string> = {
  draft: "Koncept",
  ordered: "Objednáno",
  partial: "Částečně hotovo",
  done: "Hotovo",
  cancelled: "Zrušeno",
};

export const LAB_ORDER_PRIORITY_LABELS: Record<string, string> = {
  routine: "Rutina",
  statim: "Statim",
};

export const LAB_REPORT_STATUS_LABELS: Record<string, string> = {
  preliminary: "Předběžný",
  final: "Finální",
  corrected: "Opraveno",
};

export const LAB_PANEL_GROUP_LABELS: Record<string, string> = {
  ko: "Krevní obraz",
  biochemie: "Základní biochemie",
  other: "Ostatní",
};

export const FLUID_DIRECTION_LABELS: Record<string, string> = {
  intake: "příjem",
  output: "výdej",
};

/** Known fluid category codes → Czech. Free-text categories pass through. */
export const FLUID_CATEGORY_LABELS: Record<string, string> = {
  oral: "perorální",
  iv: "IV",
  IV: "IV",
  urine: "moč",
  stool: "stolice",
  vomit: "zvracení",
  drain: "drén",
  other: "jiné",
};

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  lab_result: "Laboratorní výsledek",
  report: "Zpráva",
  imaging: "Zobrazení",
  referral: "Žádanka",
  other: "Jiné",
};

export const OBSERVATION_CATEGORY_LABELS: Record<string, string> = {
  vital_sign: "vitální funkce",
  laboratory: "laboratoř",
  body_measurement: "tělesné měření",
  symptom_score: "skóre symptomu",
  custom: "vlastní",
};

export const OBSERVATION_SOURCE_LABELS: Record<string, string> = {
  manual: "ručně",
  device_import: "import ze zařízení",
  document_import: "import z dokumentu",
};

export const OBSERVATION_VALUE_TYPE_LABELS: Record<string, string> = {
  quantity: "veličina",
  integer: "celé číslo",
  decimal: "desetinné",
  boolean: "ano/ne",
  text: "text",
  ratio: "poměr",
};

export const PHONE_USE_LABELS: Record<string, string> = {
  mobile: "Mobil",
  home: "Domácí",
  work: "Práce",
  other: "Jiné",
};

export const ADDRESS_FORM_LABELS: Record<string, string> = {
  formal_surname: "Formálně (pan/paní)",
  formal_title: "Formálně s titulem",
  given_name: "Křestním jménem",
  preferred_name: "Preferovaným jménem",
  neutral: "Neutrálně",
  custom: "Vlastní",
  en_mr_ms: "EN Mr/Ms",
  en_first: "EN křestním jménem",
};

export const ADDRESS_GENDER_LABELS: Record<string, string> = {
  male: "mužské",
  female: "ženské",
  neutral: "neutrální",
};

export const SEX_AT_BIRTH_LABELS: Record<string, string> = {
  female: "žena",
  male: "muž",
  intersex: "intersex",
  unknown: "neznámé",
  prefer_not_to_say: "nechci uvádět",
};

export const CRITICAL_FLAG_STATUS_LABELS: Record<string, string> = {
  active: "aktivní",
  inactive: "neaktivní",
};

export const TIMELINE_EVENT_TYPE_LABELS: Record<string, string> = {
  observation: "Měření",
  medication_administration: "Podání léku",
  clinical_note: "Poznámka",
  symptom: "Symptom",
  diary_scale: "Deník škál",
  lab_panel: "Laboratoř",
  fluid_balance: "Tekutiny",
  procedure: "Výkon",
  encounter: "Událost",
};

/** Export payload source keys → Czech section titles. */
export const EXPORT_SOURCE_LABELS: Record<string, string> = {
  patient: "Pacient",
  diagnoses: "Diagnózy",
  allergies: "Alergie",
  criticalFlags: "Kritická upozornění",
  observations: "Měření",
  medicationOrders: "Lékové řády",
  medicationAdministrations: "Podání léků",
  clinicalNotes: "Poznámky",
  symptoms: "Symptomy",
  diaryScaleReadings: "Deník škál",
  documents_metadata: "Dokumenty (metadata)",
  labPanels: "Laboratoř",
  fluidBalanceEntries: "Tekutiny",
  procedures: "Výkony",
  encounters: "Události / pobyty",
};

export function fluidCategoryLabel(category: string): string {
  return csLabel(FLUID_CATEGORY_LABELS, category);
}
