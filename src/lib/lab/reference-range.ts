export type SexForLabRange =
  | "female"
  | "male"
  | "intersex"
  | "unknown"
  | "prefer_not_to_say"
  | null
  | undefined;

export type LabRangeFields = {
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceLowFemale: number | null;
  referenceHighFemale: number | null;
  referenceLowMale: number | null;
  referenceHighMale: number | null;
  referenceText: string | null;
};

/** Pick adult catalog defaults by patient sex (M/Ž variants when present). */
export function resolveCatalogReferenceRange(
  def: LabRangeFields,
  sexAtBirth?: SexForLabRange,
): {
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
} {
  if (sexAtBirth === "female") {
    if (
      def.referenceLowFemale != null ||
      def.referenceHighFemale != null
    ) {
      return {
        referenceLow: def.referenceLowFemale,
        referenceHigh: def.referenceHighFemale,
        referenceText: def.referenceText,
      };
    }
  }
  if (sexAtBirth === "male") {
    if (def.referenceLowMale != null || def.referenceHighMale != null) {
      return {
        referenceLow: def.referenceLowMale,
        referenceHigh: def.referenceHighMale,
        referenceText: def.referenceText,
      };
    }
  }
  return {
    referenceLow: def.referenceLow,
    referenceHigh: def.referenceHigh,
    referenceText: def.referenceText,
  };
}
