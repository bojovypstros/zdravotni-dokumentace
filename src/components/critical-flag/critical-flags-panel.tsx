"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { CannotSaveOfflineNotice } from "@/components/pwa/cannot-save-offline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import {
  CRITICAL_FLAG_CODES,
  CRITICAL_FLAG_DEFAULT_SEVERITY,
  CRITICAL_FLAG_LABELS,
  CRITICAL_FLAG_SEVERITY_LABELS,
} from "@/lib/critical-flags";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";
import type { CriticalFlagDto } from "@/server/services/critical-flag";

type Props = {
  patientId: string;
  flags: CriticalFlagDto[];
};

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function CriticalFlagsPanel({ patientId, flags }: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string>("FALL_RISK");
  const [severity, setSeverity] = useState<string>(
    CRITICAL_FLAG_DEFAULT_SEVERITY.FALL_RISK,
  );
  const [detail, setDetail] = useState("");
  const [note, setNote] = useState("");
  const [validTo, setValidTo] = useState("");

  async function refresh() {
    startTransition(() => router.refresh());
  }

  async function addFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setError(null);
    try {
      const res = await apiFetch("/api/critical-flags", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          code,
          severity,
          detail,
          note,
          validTo: fromLocalInput(validTo),
          status: "active",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        throw new Error(data?.error ?? "Nepodařilo se přidat flag.");
      }
      setDetail("");
      setNote("");
      setValidTo("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    }
  }

  async function setInactive(id: string) {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    setError(null);
    const res = await apiFetch(`/api/critical-flags/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "inactive" }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Nepodařilo se deaktivovat.");
      return;
    }
    await refresh();
  }

  const active = flags.filter((f) => f.status === "active");
  const inactive = flags.filter((f) => f.status === "inactive");

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-medium">Kritická upozornění (flags)</h2>
        <p className="text-muted-foreground text-sm">
          Odděleně od alergií — banner na přehledu. NPO / izolace: vyplňte platnost
          do, ať nevisí zastaralé značky.
        </p>
      </div>

      <CannotSaveOfflineNotice />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {active.length === 0 ? (
        <p className="text-muted-foreground text-sm">Žádné aktivní flags.</p>
      ) : (
        <ul className="space-y-2">
          {active.map((f) => (
            <li
              key={f.id}
              className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{f.label}</span>
                  <Badge variant="secondary">
                    {CRITICAL_FLAG_SEVERITY_LABELS[f.severity]}
                  </Badge>
                </div>
                {f.detail ? (
                  <p className="text-muted-foreground text-sm">{f.detail}</p>
                ) : null}
                {f.note ? (
                  <p className="text-muted-foreground text-xs">{f.note}</p>
                ) : null}
                {f.validTo ? (
                  <p className="text-muted-foreground text-xs">
                    Platí do: {new Date(f.validTo).toLocaleString("cs-CZ")}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 shrink-0"
                disabled={!online || pending}
                onClick={() => void setInactive(f.id)}
              >
                Deaktivovat
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={(e) => void addFlag(e)}
        className="max-w-full space-y-3 overflow-x-hidden rounded-md border border-dashed border-border p-3"
        autoComplete="off"
      >
        <h3 className="text-sm font-medium">Přidat flag</h3>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <Label>Typ</Label>
            <Select
              value={code}
              onValueChange={(v) => {
                setCode(v);
                setSeverity(
                  CRITICAL_FLAG_DEFAULT_SEVERITY[
                    v as keyof typeof CRITICAL_FLAG_DEFAULT_SEVERITY
                  ],
                );
              }}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRITICAL_FLAG_CODES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CRITICAL_FLAG_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label>Závažnost</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["critical", "high", "medium"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {CRITICAL_FLAG_SEVERITY_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <Label htmlFor="flag-detail">Detail (např. typ izolace, strana)</Label>
            <Input
              id="flag-detail"
              name="flag-detail"
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              className="min-h-11 w-full min-w-0"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
            />
          </div>
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <Label htmlFor="flag-valid-to">Platí do (volitelné)</Label>
            <Input
              id="flag-valid-to"
              name="flag-valid-to"
              type="datetime-local"
              value={validTo}
              onChange={(e) => setValidTo(e.target.value)}
              className="min-h-11 w-full min-w-0 max-w-full"
              autoComplete="off"
            />
          </div>
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <Label htmlFor="flag-note">Poznámka</Label>
            <Textarea
              id="flag-note"
              name="flag-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full min-w-0"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="chart-form-actions">
          <Button
            type="submit"
            className="min-h-11"
            disabled={!online || pending}
          >
            Přidat
          </Button>
        </div>
      </form>

      {inactive.length > 0 ? (
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer">
            Neaktivní ({inactive.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {inactive.map((f) => (
              <li key={f.id} className="text-muted-foreground">
                {f.label}
                {f.detail ? ` — ${f.detail}` : ""}
                {f.validTo
                  ? ` (do ${toLocalInput(f.validTo) || f.validTo})`
                  : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
