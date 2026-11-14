"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { PatientCreateWizard } from "@/components/kartoteka/patient-create-wizard";
import { PatientArchiveActions } from "@/components/patient/patient-archive-actions";
import { PatientArchiveBadge } from "@/components/patient/patient-archive-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";
import { cn } from "@/lib/utils";
import type { PatientArchiveFilter } from "@/server/services/patient";

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
  archivedAt: string | null;
};

type Props = {
  patients: KartotekaPatient[];
  activePatientId: string | null;
  archiveFilter: PatientArchiveFilter;
};

const ARCHIVE_FILTERS: {
  value: PatientArchiveFilter;
  label: string;
}[] = [
  { value: "active", label: "Aktivní" },
  { value: "archived", label: "Archivovaní" },
  { value: "all", label: "Všichni" },
];

export function KartotekaPanel({
  patients,
  activePatientId,
  archiveFilter,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "failed">(
    "idle",
  );
  const openHandled = useRef(false);

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

  useEffect(() => {
    if (openHandled.current) return;
    const openId = searchParams.get("open");
    if (!openId) return;
    // Allow deep-link even when the patient is outside the current archive filter.
    openHandled.current = true;
    const to = searchParams.get("to");
    const href =
      to === "profile" ? `/patients/${openId}` : "/overview";
    void openChart(openId, href);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [searchParams]);

  function setArchiveFilter(next: PatientArchiveFilter) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "active") {
      params.delete("archive");
    } else {
      params.set("archive", next);
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/patients?${qs}` : "/patients");
    });
  }

  async function openChart(patientId: string, href = "/overview") {
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
        throw new Error(data?.error ?? "Nepodařilo se otevřít dekurz.");
      }
      setStatus("ok");
      startTransition(() => {
        router.push(href);
        router.refresh();
      });
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
            Vyberte pacienta a otevřete dekurz. Přepínání pacientů vždy přes
            tento seznam — klinická práce probíhá uvnitř karty.
          </p>
        </div>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filtr archivu"
        >
          {ARCHIVE_FILTERS.map((f) => {
            const selected = archiveFilter === f.value;
            return (
              <Button
                key={f.value}
                type="button"
                size="sm"
                variant={selected ? "default" : "outline"}
                className="min-h-9"
                aria-pressed={selected}
                disabled={pending}
                onClick={() => setArchiveFilter(f.value)}
              >
                {f.label}
              </Button>
            );
          })}
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
            {patients.length === 0 && archiveFilter === "active"
              ? " Založte první záznam níže."
              : null}
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {filtered.map((p) => {
              const active = p.id === activePatientId;
              const archived = Boolean(p.archivedAt);
              const subtitle = [p.birthDate, p.phone]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={p.id}
                  className={cn(
                    "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between",
                    archived && "bg-muted/30",
                  )}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      <span className="truncate">{p.displayName}</span>
                      {archived ? <PatientArchiveBadge /> : null}
                      {active ? (
                        <span className="text-muted-foreground text-xs font-normal">
                          (naposledy otevřen)
                        </span>
                      ) : null}
                      {!p.isActive ? (
                        <span className="text-muted-foreground text-xs font-normal">
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
                    <Button
                      type="button"
                      className="min-h-11"
                      disabled={pending || status === "saving"}
                      onClick={() => void openChart(p.id)}
                    >
                      Otevřít dekurz
                    </Button>
                    <PatientArchiveActions
                      patientId={p.id}
                      archivedAt={p.archivedAt}
                      compact
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {archiveFilter === "active" || archiveFilter === "all" ? (
        <PatientCreateWizard
          onCreated={async (patientId) => {
            await openChart(patientId, "/overview");
          }}
        />
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
