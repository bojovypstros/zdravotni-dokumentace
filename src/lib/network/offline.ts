/** Copy for failed/blocked saves when the server cannot be reached. */
export const OFFLINE_SAVE_MESSAGE =
  "Server nedostupný – záznam nebyl uložen.";

/** Proactive banner / form notice before the user attempts a save. */
export const OFFLINE_CANNOT_SAVE_MESSAGE =
  "Nelze uložit — nejste připojeni k serveru.";

export class OfflineError extends Error {
  constructor(message: string = OFFLINE_SAVE_MESSAGE) {
    super(message);
    this.name = "OfflineError";
  }
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
