"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ObservationChart } from "@/components/observation/observation-chart";
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
  DEFAULT_TIMEZONE,
  formatInPatientTz,
  nowWallClockInTz,
} from "@/lib/datetime/prague";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";
import { formatObservationValue } from "@/lib/observation/format";

export type DefinitionDto = {
  id: string;
  key: string;
  label: string;
  category: string;
  valueType: string;
  canonicalUnit: string | null;
  allowedUnits: string[] | null;
  displayPrecision: number;
  supportsPair: boolean;
  isSystem: boolean;
  isActive: boolean;
};

export type ObservationDto = {
  id: string;
  patientId: string;
  definitionId: string;
  definitionKey: string;
  definitionLabel: string;
  supportsPair: boolean;
  displayPrecision: number;
  category: string;
  valueType: string;
  numericValue: number | null;
  secondaryNumericValue: number | null;
  textValue: string | null;
  unit: string;
  occurredAt: string;
  recordedAt: string;
  method: string | null;
  bodySite: string | null;
  context: string | null;
  source: string;
  notes: string | null;
};

type RangeKey = "24h" | "7d" | "30d" | "90d" | "all";

type Props = {
  patientId: string;
  timeZone?: string;
  definitions: DefinitionDto[];
  observations: ObservationDto[];
};

function rangeStart(key: RangeKey): Date | null {
  const now = Date.now();
  switch (key) {
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now - 90 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export function VitalsPanel({
  patientId,
  timeZone = DEFAULT_TIMEZONE,
  definitions,
  observations,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "failed">(
    "idle",
  );
  const [view, setView] = useState<"table" | "chart">("table");
  const [range, setRange] = useState<RangeKey>("30d");
  const [definitionId, setDefinitionId] = useState(
    definitions.find((d) => d.key === "blood_pressure")?.id ??
      definitions[0]?.id ??
      "",
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const selectedDef = definitions.find((d) => d.id === definitionId);

  const [numericValue, setNumericValue] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");
  const [textValue, setTextValue] = useState("");
  const [unit, setUnit] = useState(selectedDef?.canonicalUnit ?? "");
  const [occurredAtLocal, setOccurredAtLocal] = useState(
    nowWallClockInTz(timeZone),
  );
  const [context, setContext] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");

  // Custom definition form
  const [customKey, setCustomKey] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [customUnit, setCustomUnit] = useState("");

  function selectDefinition(id: string) {
    setDefinitionId(id);
    const def = definitions.find((d) => d.id === id);
    setUnit(def?.canonicalUnit ?? "");
    setEditingId(null);
    setNumericValue("");
    setSecondaryValue("");
    setTextValue("");
    setReason("");
  }

  function loadForEdit(obs: ObservationDto) {
    setEditingId(obs.id);
    setDefinitionId(obs.definitionId);
    setNumericValue(obs.numericValue != null ? String(obs.numericValue) : "");
    setSecondaryValue(
      obs.secondaryNumericValue != null ? String(obs.secondaryNumericValue) : "",
    );
    setTextValue(obs.textValue ?? "");
    setUnit(obs.unit);
    setOccurredAtLocal(
      formatInPatientTz(obs.occurredAt, "yyyy-MM-dd'T'HH:mm", timeZone),
    );
    setContext(obs.context ?? "");
    setNotes(obs.notes ?? "");
    setReason("");
    setView("table");
  }

  const filtered = useMemo(() => {
    const start = rangeStart(range);
    return observations
      .filter((o) => o.definitionId === definitionId)
      .filter((o) => (start ? new Date(o.occurredAt) >= start : true))
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      );
  }, [observations, definitionId, range]);

  const chartPoints = useMemo(
    () =>
      filtered.map((o) => ({
        occurredAt: o.occurredAt,
        value: o.numericValue ?? undefined,
        secondary: o.secondaryNumericValue ?? undefined,
        label: formatObservationValue(o),
      })),
    [filtered],
  );

  async function saveObservation(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedDef) return;
    setSaveState("saving");
    setError(null);

    const body = {
      patientId,
      definitionId,
      numericValue: numericValue === "" ? null : Number(numericValue),
      secondaryNumericValue:
        secondaryValue === "" ? null : Number(secondaryValue),
      textValue: textValue || null,
      unit,
      occurredAtLocal,
      context,
      notes,
      source: "manual" as const,
      ...(editingId && reason.trim() ? { reason: reason.trim() } : {}),
    };

    try {
      const res = await apiFetch(
        editingId ? `/api/observations/${editingId}` : "/api/observations",
        {
          method: editingId ? "PATCH" : "POST",
          body: JSON.stringify(body),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setSaveState("failed");
        setError(data.error ?? "Měření se nepodařilo uložit.");
        return;
      }
      setSaveState("saved");
      setEditingId(null);
      setNumericValue("");
      setSecondaryValue("");
      setTextValue("");
      setContext("");
      setNotes("");
      setReason("");
      setOccurredAtLocal(nowWallClockInTz(timeZone));
      startTransition(() => router.refresh());
    } catch {
      setSaveState("failed");
      setError("Server nedostupný – záznam nebyl uložen.");
    }
  }

  async function createCustomDefinition(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaveState("saving");
    try {
      const res = await apiFetch("/api/observation-definitions", {
        method: "POST",
        body: JSON.stringify({
          patientId,
          key: customKey,
          label: customLabel,
          category: "custom",
          valueType: "decimal",
          canonicalUnit: customUnit,
          allowedUnits: [customUnit],
          displayPrecision: 1,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        definition?: DefinitionDto;
      };
      if (!res.ok) {
        setSaveState("failed");
        setError(data.error ?? "Definici se nepodařilo vytvořit.");
        return;
      }
      setSaveState("saved");
      setCustomKey("");
      setCustomLabel("");
      setCustomUnit("");
      if (data.definition) setDefinitionId(data.definition.id);
      startTransition(() => router.refresh());
    } catch {
      setSaveState("failed");
      setError("Server nedostupný – záznam nebyl uložen.");
    }
  }

  const units = selectedDef?.allowedUnits?.length
    ? selectedDef.allowedUnits
    : selectedDef?.canonicalUnit
      ? [selectedDef.canonicalUnit]
      : [];

  return (
    <div className="flex flex-col gap-8">
      <CannotSaveOfflineNotice />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-[12rem] flex-1 gap-1.5">
            <Label htmlFor="metric">Veličina</Label>
            <Select value={definitionId} onValueChange={selectDefinition}>
              <SelectTrigger id="metric" className="w-full">
                <SelectValue placeholder="Vyberte veličinu" />
              </SelectTrigger>
              <SelectContent>
                {definitions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                    {d.isSystem ? "" : " (vlastní)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="range">Období</Label>
            <Select
              value={range}
              onValueChange={(v) => setRange(v as RangeKey)}
            >
              <SelectTrigger id="range" className="w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">24 h</SelectItem>
                <SelectItem value="7d">7 dní</SelectItem>
                <SelectItem value="30d">30 dní</SelectItem>
                <SelectItem value="90d">90 dní</SelectItem>
                <SelectItem value="all">Vše</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={view === "table" ? "default" : "outline"}
              onClick={() => setView("table")}
            >
              Tabulka
            </Button>
            <Button
              type="button"
              variant={view === "chart" ? "default" : "outline"}
              onClick={() => setView("chart")}
            >
              Graf
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground text-xs">
          Časy v pásmu {timeZone}. Prahy/zimní čas řeší IANA zóna — hodnoty se
          ukládají jako UTC.
        </p>
      </section>

      <section className="border-border rounded-xl border p-4">
        <h2 className="mb-3 text-base font-medium">
          {editingId ? "Upravit / korigovat měření" : "Přidat měření"}
        </h2>
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveObservation}>
          {selectedDef?.supportsPair ? (
            <>
              <div className="grid gap-1.5">
                <Label htmlFor="sys">Systolický</Label>
                <Input
                  id="sys"
                  inputMode="decimal"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="dia">Diastolický</Label>
                <Input
                  id="dia"
                  inputMode="decimal"
                  value={secondaryValue}
                  onChange={(e) => setSecondaryValue(e.target.value)}
                  required
                />
              </div>
            </>
          ) : selectedDef?.valueType === "text" ||
            selectedDef?.valueType === "boolean" ? (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="textVal">Hodnota</Label>
              <Input
                id="textVal"
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                required
              />
            </div>
          ) : (
            <div className="grid gap-1.5">
              <Label htmlFor="num">Hodnota</Label>
              <Input
                id="num"
                inputMode="decimal"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
                required
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="unit">Jednotka</Label>
            {units.length > 1 ? (
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input id="unit" value={unit} onChange={(e) => setUnit(e.target.value)} required />
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="when">Čas měření ({timeZone})</Label>
            <Input
              id="when"
              type="datetime-local"
              value={occurredAtLocal}
              onChange={(e) => setOccurredAtLocal(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ctx">Kontext</Label>
            <Input
              id="ctx"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="např. v klidu"
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Poznámka</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {editingId ? (
            <div className="grid gap-1.5 sm:col-span-2">
              <Label htmlFor="reason">Důvod korekce (volitelné → audit correction)</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="např. překlep v hodnotě"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button
              type="submit"
              disabled={pending || saveState === "saving" || !online}
            >
              {saveState === "saving"
                ? "Ukládám…"
                : editingId
                  ? "Uložit úpravu"
                  : "Uložit měření"}
            </Button>
            {editingId ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingId(null);
                  setReason("");
                }}
              >
                Zrušit úpravu
              </Button>
            ) : null}
            <span
              className={
                online
                  ? "text-muted-foreground text-xs"
                  : "text-destructive text-xs"
              }
              aria-live="polite"
            >
              {!online
                ? OFFLINE_CANNOT_SAVE_MESSAGE
                : saveState === "saved"
                  ? "Uloženo"
                  : saveState === "failed"
                    ? "Uložení selhalo"
                    : null}
            </span>
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-base font-medium">
          Historie
          {selectedDef ? (
            <Badge variant="secondary" className="ml-2 align-middle">
              {selectedDef.label}
            </Badge>
          ) : null}
        </h2>
        {view === "chart" && selectedDef ? (
          <ObservationChart
            points={chartPoints}
            unit={selectedDef.canonicalUnit ?? unit}
            supportsPair={selectedDef.supportsPair}
            timeZone={timeZone}
            precision={selectedDef.displayPrecision}
          />
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Zatím žádná měření. Přidejte první hodnotu výše.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-border border-b">
                  <th className="py-2 pr-3 font-medium">Čas ({timeZone})</th>
                  <th className="py-2 pr-3 font-medium">Hodnota</th>
                  <th className="py-2 pr-3 font-medium">Kontext</th>
                  <th className="py-2 font-medium">Akce</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} className="border-border border-b">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {formatInPatientTz(o.occurredAt, "d. M. yyyy HH:mm", timeZone)}
                    </td>
                    <td className="py-2 pr-3 font-medium">
                      {formatObservationValue(o)}
                    </td>
                    <td className="text-muted-foreground py-2 pr-3">
                      {o.context || "—"}
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => loadForEdit(o)}
                      >
                        Upravit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-border rounded-xl border p-4">
        <h2 className="mb-3 text-base font-medium">Vlastní veličina</h2>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={createCustomDefinition}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="ckey">Klíč</Label>
            <Input
              id="ckey"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="waist_cm"
              required
              pattern="[a-z][a-z0-9_]*"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="clabel">Název</Label>
            <Input
              id="clabel"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="Obvod pasu"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cunit">Jednotka</Label>
            <Input
              id="cunit"
              value={customUnit}
              onChange={(e) => setCustomUnit(e.target.value)}
              placeholder="cm"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <Button
              type="submit"
              variant="secondary"
              disabled={pending || !online}
            >
              Přidat vlastní veličinu
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
