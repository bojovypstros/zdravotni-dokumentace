"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

type Props = {
  patientId: string;
  archivedAt: string | null;
  /** Compact outline buttons for list rows. */
  compact?: boolean;
};

export function PatientArchiveActions({
  patientId,
  archivedAt,
  compact = false,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const archived = Boolean(archivedAt);

  async function run(action: "archive" | "unarchive") {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const path =
        action === "archive"
          ? `/api/patients/${patientId}/archive`
          : `/api/patients/${patientId}/unarchive`;
      const res = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(
          data?.error ??
            (action === "archive"
              ? "Nepodařilo se archivovat pacienta."
              : "Nepodařilo se obnovit pacienta z archivu."),
        );
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant={archived ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        className={compact ? "min-h-9" : "min-h-11"}
        disabled={busy || pending}
        onClick={() => void run(archived ? "unarchive" : "archive")}
      >
        {archived ? "Obnovit z archivu" : "Archivovat"}
      </Button>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
