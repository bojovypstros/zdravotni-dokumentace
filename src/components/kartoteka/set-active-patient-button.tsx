"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

export function SetActivePatientButton({ patientId }: { patientId: string }) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const res = await apiFetch("/api/patients/active", {
        method: "POST",
        body: JSON.stringify({ patientId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? "Nepodařilo se přepnout pacienta.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button
        type="button"
        className="min-h-11"
        disabled={!online || saving}
        onClick={() => void onClick()}
      >
        {saving ? "Přepínám…" : "Nastavit jako aktivního"}
      </Button>
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}
