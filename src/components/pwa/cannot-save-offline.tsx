"use client";

import { WifiOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

/** Inline notice for forms / sheets when the browser reports offline. */
export function CannotSaveOfflineNotice() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <Alert variant="destructive">
      <WifiOff aria-hidden />
      <AlertTitle>Nelze uložit</AlertTitle>
      <AlertDescription>{OFFLINE_CANNOT_SAVE_MESSAGE}</AlertDescription>
    </Alert>
  );
}
