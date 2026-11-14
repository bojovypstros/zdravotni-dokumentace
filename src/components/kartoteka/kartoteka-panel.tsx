"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CannotSaveOfflineNotice } from "@/components/pwa/cannot-save-offline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

export type KartotekaPatient = {
  id: string;
  displayName: string;
  preferredName: string | null;
  givenName: string | null;
  familyName: string | null;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
};

type Props = {
  patients: KartotekaPatient[];
  activePatientId: string | null;
};

export function KartotekaPanel({ patients, activePatientId }: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "failed">(
    "idle",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const hay = [
        p.displayName,
        p.preferredName,
        p.givenName,
        p.familyName,
        p.phone,
        p.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [patients, query]);

  async function selectPatient(patientId: string) {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setError(null);
    setStatus("saving");
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
      setStatus("ok");
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Chyba");
    }
  }

  async function createPatient(e: React.FormEvent) {
    e.preventDefault();
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setError(null);
    setStatus("saving");
    try {
      const res = await apiFetch("/api/patients", {
        method: "POST",
        body: JSON.stringify({
          displayName: displayName.trim(),
          preferredName: displayName.trim(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        patient?: { id: string };
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Nepodařilo se vytvořit pacienta.");
      }
      setDisplayName("");
      setStatus("ok");
      const id = data?.patient?.id;
      if (id) {
        router.push(`/patients/${id}`);
        router.refresh();
        return;
      }
      startTransition(() => router.refresh());
    } catch (err) {
      setStatus("failed");
      setError(err instanceof Error ? err.message : "Chyba");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-base font-medium">Kartotéka</h2>
          <p className="text-muted-foreground text-sm">
            Více pacientů — aktivní záznam určuje, s kým pracují přehled,
            timeline a zápisy. Pacienti nemají vlastní účet.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="kartoteka-search">Hledat</Label>
          <Input
            id="kartoteka-search"
            name="kartoteka-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jméno, telefon, e-mail…"
            className="min-h-11"
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground rounded-md border border-dashed border-border p-4 text-sm">
            Žádný pacient neodpovídá filtru.
            {patients.length === 0
              ? " Založte první záznam níže."
              : null}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {filtered.map((p) => {
              const active = p.id === activePatientId;
              const subtitle = [
                p.preferredName && p.preferredName !== p.displayName
                  ? p.preferredName
                  : null,
                p.birthDate,
                p.phone,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={p.id}
                  className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      <Link
                        href={`/patients/${p.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {p.displayName}
                      </Link>
                      {active ? (
                        <span className="text-muted-foreground ml-2 text-xs font-normal">
                          (aktivní)
                        </span>
                      ) : null}
                      {!p.isActive ? (
                        <span className="text-muted-foreground ml-2 text-xs font-normal">
                          neaktivní
                        </span>
                      ) : null}
                    </p>
                    {subtitle ? (
                      <p className="text-muted-foreground truncate text-sm">
                        {subtitle}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button asChild variant="outline" className="min-h-11">
                      <Link href={`/patients/${p.id}`}>Profil</Link>
                    </Button>
                    <Button
                      type="button"
                      variant={active ? "secondary" : "default"}
                      className="min-h-11"
                      disabled={active || pending || status === "saving"}
                      onClick={() => void selectPatient(p.id)}
                    >
                      {active ? "Aktivní" : "Aktivovat"}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Nový pacient</h2>
        <CannotSaveOfflineNotice />
        <form
          onSubmit={(e) => void createPatient(e)}
          className="space-y-3"
          autoComplete="off"
        >
          <div className="space-y-2">
            <Label htmlFor="kartoteka-new-patient-display-name">
              Zobrazované jméno
            </Label>
            <Input
              id="kartoteka-new-patient-display-name"
              name="kartoteka-new-patient-display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={120}
              className="min-h-11"
              placeholder="např. Jan Novák"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
          <Button
            type="submit"
            className="min-h-11"
            disabled={!online || status === "saving" || !displayName.trim()}
          >
            {status === "saving" ? "Ukládám…" : "Založit a otevřít"}
          </Button>
        </form>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
