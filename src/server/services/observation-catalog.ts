import type {
  ObservationCategory,
  ObservationValueType,
  Prisma,
} from "@prisma/client";

/** System ObservationDefinition catalog (fictional metadata only). */
export type SystemDefinitionSeed = {
  key: string;
  label: string;
  category: ObservationCategory;
  valueType: ObservationValueType;
  canonicalUnit: string;
  allowedUnits: string[];
  displayPrecision: number;
  supportsPair?: boolean;
  lowerReference?: number | null;
  upperReference?: number | null;
};

export const SYSTEM_OBSERVATION_DEFINITIONS: SystemDefinitionSeed[] = [
  {
    key: "blood_pressure",
    label: "Krevní tlak",
    category: "vital_sign",
    valueType: "quantity",
    canonicalUnit: "mmHg",
    allowedUnits: ["mmHg"],
    displayPrecision: 0,
    supportsPair: true,
  },
  {
    key: "heart_rate",
    label: "Tep",
    category: "vital_sign",
    valueType: "integer",
    canonicalUnit: "/min",
    allowedUnits: ["/min", "bpm"],
    displayPrecision: 0,
  },
  {
    key: "body_temperature",
    label: "Teplota",
    category: "vital_sign",
    valueType: "decimal",
    canonicalUnit: "°C",
    allowedUnits: ["°C", "°F"],
    displayPrecision: 1,
  },
  {
    key: "spo2",
    label: "SpO₂",
    category: "vital_sign",
    valueType: "integer",
    canonicalUnit: "%",
    allowedUnits: ["%"],
    displayPrecision: 0,
  },
  {
    key: "respiratory_rate",
    label: "Dechová frekvence",
    category: "vital_sign",
    valueType: "integer",
    canonicalUnit: "/min",
    allowedUnits: ["/min"],
    displayPrecision: 0,
  },
  {
    key: "weight",
    label: "Hmotnost",
    category: "body_measurement",
    valueType: "decimal",
    canonicalUnit: "kg",
    allowedUnits: ["kg", "lb"],
    displayPrecision: 1,
  },
  {
    key: "height",
    label: "Výška",
    category: "body_measurement",
    valueType: "decimal",
    canonicalUnit: "cm",
    allowedUnits: ["cm", "in"],
    displayPrecision: 1,
  },
  // Phase 6 quick-add lab stubs — single-analyte Observation rows (not LabPanel).
  {
    key: "glucose",
    label: "Glukóza",
    category: "laboratory",
    valueType: "decimal",
    canonicalUnit: "mmol/l",
    allowedUnits: ["mmol/l", "mg/dl"],
    displayPrecision: 1,
  },
  {
    key: "hemoglobin",
    label: "Hemoglobin",
    category: "laboratory",
    valueType: "decimal",
    canonicalUnit: "g/l",
    allowedUnits: ["g/l", "g/dl"],
    displayPrecision: 0,
  },
  {
    key: "crp",
    label: "CRP",
    category: "laboratory",
    valueType: "decimal",
    canonicalUnit: "mg/l",
    allowedUnits: ["mg/l"],
    displayPrecision: 1,
  },
  {
    key: "creatinine",
    label: "Kreatinin",
    category: "laboratory",
    valueType: "decimal",
    canonicalUnit: "µmol/l",
    allowedUnits: ["µmol/l", "mg/dl"],
    displayPrecision: 0,
  },
];

export function systemDefinitionCreateData(
  def: SystemDefinitionSeed,
): Prisma.ObservationDefinitionCreateInput {
  return {
    key: def.key,
    label: def.label,
    category: def.category,
    valueType: def.valueType,
    canonicalUnit: def.canonicalUnit,
    allowedUnits: def.allowedUnits,
    displayPrecision: def.displayPrecision,
    supportsPair: def.supportsPair ?? false,
    lowerReference: def.lowerReference ?? null,
    upperReference: def.upperReference ?? null,
    isSystem: true,
    isActive: true,
  };
}
