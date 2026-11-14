/** Shared observation value formatting (client + server). No interpolation. */

export function formatObservationValue(o: {
  numericValue: number | null;
  secondaryNumericValue: number | null;
  textValue: string | null;
  unit: string;
  supportsPair: boolean;
  displayPrecision: number;
}): string {
  if (
    o.supportsPair &&
    o.numericValue != null &&
    o.secondaryNumericValue != null
  ) {
    const a = o.numericValue.toFixed(o.displayPrecision);
    const b = o.secondaryNumericValue.toFixed(o.displayPrecision);
    return `${a}/${b} ${o.unit}`;
  }
  if (o.numericValue != null) {
    return `${o.numericValue.toFixed(o.displayPrecision)} ${o.unit}`;
  }
  if (o.textValue) return o.textValue;
  return "—";
}
