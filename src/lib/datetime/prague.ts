import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const DEFAULT_TIMEZONE = "Europe/Prague";

/** Format UTC instant for display in patient TZ (default Europe/Prague). */
export function formatInPatientTz(
  date: Date | string,
  pattern = "d. M. yyyy HH:mm",
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(d, timeZone, pattern);
}

/**
 * Parse a datetime-local-like value (YYYY-MM-DDTHH:mm) as wall clock in patient TZ → UTC Date.
 * Does not invent missing measurements — only converts timezone.
 */
export function parseWallClockInTz(
  localIsoWithoutOffset: string,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  // date-fns-tz fromZonedTime treats the input as local wall time in the given zone
  return fromZonedTime(localIsoWithoutOffset, timeZone);
}

/** Current wall-clock string for datetime-local inputs in patient TZ. */
export function nowWallClockInTz(timeZone: string = DEFAULT_TIMEZONE): string {
  return formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd'T'HH:mm");
}

export function toPatientZonedDate(
  date: Date | string,
  timeZone: string = DEFAULT_TIMEZONE,
): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  return toZonedTime(d, timeZone);
}
