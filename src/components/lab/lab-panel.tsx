"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CannotSaveOfflineNotice } from "@/components/pwa/cannot-save-offline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import {
  DEFAULT_TIMEZONE,
  formatInPatientTz,
  nowWallClockInTz,
} from "@/lib/datetime/prague";
import { LAB_RESULT_FLAG_LABELS as FLAG_LABELS } from "@/lib/labels/cs";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

export type LabResultDto = {
  id?: string;
  analyte: string;
  valueNumeric: number | null;
  valueText: string | null;
  unit: string | null;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string | null;
  flag: string;
  notes: string | null;
};

export type LabPanelDto = {
  id: string;
  patientId: string;
  title: string;
  collectedAt: string | null;
  resultedAt: string | null;
  laboratory: string | null;
  source: string | null;
  notes: string | null;
  results: LabResultDto[];
};

type ResultDraft = {
  analyte: string;
  valueNumeric: string;
  valueText: string;
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  flag: string;
};

type Props = {
  patientId: string;
  timeZone?: string;
  panels: LabPanelDto[];
};

function emptyResult(): ResultDraft {
  return {
    analyte: "",
    valueNumeric: "",
    valueText: "",
    unit: "",
    referenceLow: "",
    referenceHigh: "",
    flag: "",
  };
}

export function LabPanelsView({
  patientId,
  timeZone = DEFAULT_TIMEZONE,
  panels,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const [title, setTitle] = useState("");
  const [laboratory, setLaboratory] = useState("");
  const [collectedAtLocal, setCollectedAtLocal] = useState(
    nowWallClockInTz(timeZone),
  );
  const [resultedAtLocal, setResultedAtLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<ResultDraft[]>([emptyResult()]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function resetForm() {
    setTitle("");
    setLaboratory("");
    setCollectedAtLocal(nowWallClockInTz(timeZone));
    setResultedAtLocal("");
    setNotes("");
    setResults([emptyResult()]);
    setEditingId(null);
    setReason("");
  }

  function loadPanel(p: LabPanelDto) {
    setEditingId(p.id);
    setTitle(p.title);
    setLaboratory(p.laboratory ?? "");
    setCollectedAtLocal(
      p.collectedAt
        ? formatInPatientTz(p.collectedAt, "yyyy-MM-dd'T'HH:mm", timeZone)
        : "",
    );
    setResultedAtLocal(
      p.resultedAt
        ? formatInPatientTz(p.resultedAt, "yyyy-MM-dd'T'HH:mm", timeZone)
        : "",
    );
    setNotes(p.notes ?? "");
    setResults(
      p.results.map((r) => ({
        analyte: r.analyte,
        valueNumeric: r.valueNumeric != null ? String(r.valueNumeric) : "",
        valueText: r.valueText ?? "",
        unit: r.unit ?? "",
        referenceLow: r.referenceLow != null ? String(r.referenceLow) : "",
        referenceHigh: r.referenceHigh != null ? String(r.referenceHigh) : "",
        flag: r.flag === "unknown" ? "" : r.flag,
      })),
    );
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

    const payload = {
      patientId,
      title: title.trim(),
      collectedAtLocal: collectedAtLocal || "",
      resultedAtLocal: resultedAtLocal || "",
      laboratory,
      source: "manual",
      notes,
      reason: editingId ? reason : "",
      results: results
        .filter((r) => r.analyte.trim())
        .map((r) => ({
          analyte: r.analyte.trim(),
          valueNumeric: r.valueNumeric === "" ? null : Number(r.valueNumeric),
          valueText: r.valueText,
          unit: r.unit,
          referenceLow: r.referenceLow === "" ? null : Number(r.referenceLow),
          referenceHigh:
            r.referenceHigh === "" ? null : Number(r.referenceHigh),
          ...(r.flag ? { flag: r.flag } : {}),
        })),
    };

    const res = await apiFetch(
      editingId ? `/api/lab-panels/${editingId}` : "/api/lab-panels",
      {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení panelu selhalo.");
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

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-base font-medium">
          {editingId ? "Upravit lab panel" : "Nový lab panel"}
        </h2>
        <p className="text-muted-foreground text-sm">
          Panel = skupina analytů (např. krevní obraz). Referenční meze se
          ukládají u každého výsledku. Flag mimo meze se odvodí z intervalu,
          pokud není zadán ručně.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="lab-title">Název panelu</Label>
            <Input
              id="lab-title"
              className="min-h-11"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab-collected">Odběr</Label>
            <Input
              id="lab-collected"
              type="datetime-local"
              className="min-h-11"
              value={collectedAtLocal}
              onChange={(e) => setCollectedAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab-resulted">Výsledek</Label>
            <Input
              id="lab-resulted"
              type="datetime-local"
              className="min-h-11"
              value={resultedAtLocal}
              onChange={(e) => setResultedAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab-lab">Laboratoř</Label>
            <Input
              id="lab-lab"
              className="min-h-11"
              value={laboratory}
              onChange={(e) => setLaboratory(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lab-notes">Poznámka</Label>
            <Input
              id="lab-notes"
              className="min-h-11"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Analyty</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setResults((prev) => [...prev, emptyResult()])}
            >
              + analyt
            </Button>
          </div>
          {results.map((r, idx) => (
            <div
              key={idx}
              className="grid gap-2 rounded-md border border-border/70 p-3 sm:grid-cols-6"
            >
              <Input
                className="min-h-11 sm:col-span-2"
                placeholder="Analyt"
                value={r.analyte}
                onChange={(e) =>
                  setResults((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, analyte: e.target.value } : row,
                    ),
                  )
                }
              />
              <Input
                className="min-h-11"
                placeholder="Hodnota"
                inputMode="decimal"
                value={r.valueNumeric}
                onChange={(e) =>
                  setResults((prev) =>
                    prev.map((row, i) =>
                      i === idx
                        ? { ...row, valueNumeric: e.target.value }
                        : row,
                    ),
                  )
                }
              />
              <Input
                className="min-h-11"
                placeholder="Jednotka"
                value={r.unit}
                onChange={(e) =>
                  setResults((prev) =>
                    prev.map((row, i) =>
                      i === idx ? { ...row, unit: e.target.value } : row,
                    ),
                  )
                }
              />
              <Input
                className="min-h-11"
                placeholder="Ref. low"
                inputMode="decimal"
                value={r.referenceLow}
                onChange={(e) =>
                  setResults((prev) =>
                    prev.map((row, i) =>
                      i === idx
                        ? { ...row, referenceLow: e.target.value }
                        : row,
                    ),
                  )
                }
              />
              <Input
                className="min-h-11"
                placeholder="Ref. high"
                inputMode="decimal"
                value={r.referenceHigh}
                onChange={(e) =>
                  setResults((prev) =>
                    prev.map((row, i) =>
                      i === idx
                        ? { ...row, referenceHigh: e.target.value }
                        : row,
                    ),
                  )
                }
              />
            </div>
          ))}
        </div>

        {editingId ? (
          <div className="space-y-1.5">
            <Label htmlFor="lab-reason">Důvod korekce (volitelné)</Label>
            <Input
              id="lab-reason"
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
            disabled={pending || saveState === "saving" || !title.trim()}
            onClick={() => void save()}
          >
            {saveState === "saving"
              ? "Ukládám…"
              : saveState === "saved"
                ? "Uloženo"
                : editingId
                  ? "Uložit změny"
                  : "Uložit panel"}
          </Button>
          {editingId ? (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Zrušit editaci
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-medium">Panely</h2>
        {panels.length === 0 ? (
          <p className="text-muted-foreground text-sm">Zatím žádné panely.</p>
        ) : (
          <ul className="space-y-3">
            {panels.map((p) => (
              <li
                key={p.id}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {p.collectedAt
                        ? formatInPatientTz(
                            p.collectedAt,
                            "d. M. yyyy HH:mm",
                            timeZone,
                          )
                        : "—"}
                      {p.laboratory ? ` · ${p.laboratory}` : ""}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => loadPanel(p)}
                  >
                    Upravit
                  </Button>
                </div>
                <ul className="space-y-1 text-sm">
                  {p.results.map((r) => (
                    <li key={r.id ?? r.analyte} className="flex flex-wrap gap-2">
                      <span className="font-medium">{r.analyte}</span>
                      <span>
                        {r.valueNumeric != null
                          ? `${r.valueNumeric}${r.unit ? ` ${r.unit}` : ""}`
                          : (r.valueText ?? "")}
                      </span>
                      <Badge variant="secondary">
                        {FLAG_LABELS[r.flag] ?? r.flag}
                      </Badge>
                      {r.referenceLow != null || r.referenceHigh != null ? (
                        <span className="text-muted-foreground text-xs">
                          ref {r.referenceLow ?? "…"}–{r.referenceHigh ?? "…"}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
