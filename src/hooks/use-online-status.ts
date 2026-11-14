"use client";

import { useEffect, useState } from "react";

import { isBrowserOffline } from "@/lib/network/offline";

/**
 * Tracks `navigator.onLine` plus online/offline window events.
 * Does not probe the server — failed saves still surface via apiFetch.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    function sync() {
      setOnline(!isBrowserOffline());
    }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return online;
}
