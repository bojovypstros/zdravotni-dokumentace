"use client";

import { WifiOff } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

/** In-flow banner (not sticky) so it does not overlap the app topbar. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;

  return (
    <div
      className="z-50 border-b border-destructive/30 bg-background px-3 py-2"
      role="status"
      aria-live="assertive"
    >
      <Alert variant="destructive">
        <WifiOff aria-hidden />
        <AlertTitle>Offline</AlertTitle>
        <AlertDescription>
          {OFFLINE_CANNOT_SAVE_MESSAGE} Žádná pacientská data se neukládají do
          mezipaměti zařízení.
        </AlertDescription>
      </Alert>
    </div>
  );
}
