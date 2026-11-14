"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import {
  DEFAULT_TIMEZONE,
  formatInPatientTz,
  nowWallClockInTz,
} from "@/lib/datetime/prague";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

export type FluidEntryDto = {
  id: string;
  patientId: string;
  direction: "intake" | "output";
  category: string;
  amountMl: number;
  occurredAt: string;
  notes: string | null;
};

export type FluidDayDto = {
  dateKey: string;
  intakeMl: number;
  outputMl: number;
  netMl: number;
  entryCount: number;
};

type Props = {
  patientId: string;
  timeZone?: string;
  entries: FluidEntryDto[];
  daily: FluidDayDto[];
};

export function FluidsPanel({
  patientId,
  timeZone = DEFAULT_TIMEZONE,
  entries,
  daily,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const [direction, setDirection] = useState<"intake" | "output">("intake");
  const [category, setCategory] = useState("oral");
  const [amountMl, setAmountMl] = useState("250");
  const [occurredAtLocal, setOccurredAtLocal] = useState(
    nowWallClockInTz(timeZone),
  );
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const todayKey = useMemo(
    () => formatInPatientTz(new Date().toISOString(), "yyyy-MM-dd", timeZone),
    [timeZone],
  );
  const today = daily.find((d) => d.dateKey === todayKey);

  function resetForm() {
    setDirection("intake");
    setCategory("oral");
    setAmountMl("250");
    setOccurredAtLocal(nowWallClockInTz(timeZone));
    setNotes("");
    setEditingId(null);
    setReason("");
  }

  function loadEntry(e: FluidEntryDto) {
    setEditingId(e.id);
    setDirection(e.direction);
    setCategory(e.category);
    setAmountMl(String(e.amountMl));
    setOccurredAtLocal(
      formatInPatientTz(e.occurredAt, "yyyy-MM-dd'T'HH:mm", timeZone),
    );
    setNotes(e.notes ?? "");
    setReason("");
  }

  async function save() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      setSaveState("failed");
      return;
    }
    setError(null);
    setSaveState("saving");
    const res = await apiFetch(
      editingId ? `/api/fluid-balance/${editingId}` : "/api/fluid-balance",
      {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          patientId,
          direction,
          category,
          amountMl: Number(amountMl),
          occurredAtLocal,
          notes,
          reason: editingId ? reason : "",
        }),
      },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    resetForm();
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-6">
      {!online ? <CannotSaveOfflineNotice /> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <AlertTitle>Denní bilance (bez klinického doporučení)</AlertTitle>
        <AlertDescription>
          Dnes: příjem {today?.intakeMl ?? 0} ml · výdej {today?.outputMl ?? 0}{" "}
          ml · čistá bilance {today?.netMl ?? 0} ml. Údaje jsou evidenční, ne
          diagnostické.
        </AlertDescription>
      </Alert>

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-base font-medium">
          {editingId ? "Upravit záznam" : "Nový záznam tekutin"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Směr</Label>
            <Select
              value={direction}
              onValueChange={(v) => setDirection(v as "intake" | "output")}
            >
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="intake">Příjem</SelectItem>
                <SelectItem value="output">Výdej</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fluid-cat">Kategorie</Label>
            <Input
              id="fluid-cat"
              className="min-h-11"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="oral / IV / urine / …"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fluid-ml">Objem (ml)</Label>
            <Input
              id="fluid-ml"
              className="min-h-11"
              inputMode="decimal"
              value={amountMl}
              onChange={(e) => setAmountMl(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fluid-when">Čas</Label>
            <Input
              id="fluid-when"
              type="datetime-local"
              className="min-h-11"
              value={occurredAtLocal}
              onChange={(e) => setOccurredAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fluid-notes">Poznámka</Label>
            <Input
              id="fluid-notes"
              className="min-h-11"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        {editingId ? (
          <div className="space-y-1.5">
            <Label htmlFor="fluid-reason">Důvod korekce</Label>
            <Input
              id="fluid-reason"
              className="min-h-11"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="min-h-11"
            disabled={pending || saveState === "saving"}
            onClick={() => void save()}
          >
            {saveState === "saving" ? "Ukládám…" : "Uložit"}
          </Button>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Zrušit
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Denní součty</h2>
        {daily.length === 0 ? (
          <p className="text-muted-foreground text-sm">Zatím bez záznamů.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {daily.slice(0, 14).map((d) => (
              <li
                key={d.dateKey}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
              >
                <span className="font-medium">{d.dateKey}</span>
                <span className="text-muted-foreground">
                  +{d.intakeMl} / −{d.outputMl} · netto {d.netMl} ml ·{" "}
                  {d.entryCount}×
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-medium">Záznamy</h2>
        <ul className="space-y-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">
                    {e.direction === "intake" ? "příjem" : "výdej"}
                  </Badge>
                  <span className="font-medium">{e.amountMl} ml</span>
                  <span className="text-muted-foreground">{e.category}</span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {formatInPatientTz(e.occurredAt, "d. M. yyyy HH:mm", timeZone)}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => loadEntry(e)}
              >
                Upravit
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
