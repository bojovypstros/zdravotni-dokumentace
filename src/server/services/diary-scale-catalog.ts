/** System diary scale catalog (PRD §6.6). Fictional metadata only. */

export type SystemDiaryScaleSeed = {
  key: string;
  label: string;
  minValue: number;
  maxValue: number;
  sortOrder: number;
};

export const SYSTEM_DIARY_SCALES: SystemDiaryScaleSeed[] = [
  { key: "mood", label: "Nálada", minValue: 0, maxValue: 10, sortOrder: 10 },
  { key: "anxiety", label: "Úzkost", minValue: 0, maxValue: 10, sortOrder: 20 },
  { key: "energy", label: "Energie", minValue: 0, maxValue: 10, sortOrder: 30 },
  { key: "fatigue", label: "Únava", minValue: 0, maxValue: 10, sortOrder: 40 },
  { key: "sleep", label: "Spánek", minValue: 0, maxValue: 10, sortOrder: 50 },
  { key: "pain", label: "Bolest", minValue: 0, maxValue: 10, sortOrder: 60 },
  {
    key: "nausea",
    label: "Nevolnost",
    minValue: 0,
    maxValue: 10,
    sortOrder: 70,
  },
];

export function systemDiaryScaleCreateData(seed: SystemDiaryScaleSeed) {
  return {
    patientId: null as string | null,
    key: seed.key,
    label: seed.label,
    minValue: seed.minValue,
    maxValue: seed.maxValue,
    sortOrder: seed.sortOrder,
    isSystem: true,
    isActive: true,
  };
}
