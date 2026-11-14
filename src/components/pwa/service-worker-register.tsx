"use client";

import { useEffect } from "react";

/**
 * Registers the static-shell service worker in production.
 * SW must never cache private/API data — see public/sw.js.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    let cancelled = false;

    void (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (cancelled) return;
        void registration.update();
      } catch {
        // Installability still works with manifest; SW is best-effort.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
