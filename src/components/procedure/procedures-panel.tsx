"use client";

import { useState, useTransition } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import {
  DEFAULT_TIMEZONE,
  formatInPatientTz,
  nowWallClockInTz,
} from "@/lib/datetime/prague";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";
import { PROCEDURE_STATUS_LABELS as STATUS_LABELS } from "@/lib/labels/cs";

export type ProcedureDto = {
  id: string;
  patientId: string;
  display: string;
  status: string;
  occurredAt: string;
  performerLabel: string | null;
  outcome: string | null;
  notes: string | null;
};

type Props = {
  patientId: string;
  timeZone?: string;
  procedures: ProcedureDto[];
};

export function ProceduresPanel({
  patientId,
  timeZone = DEFAULT_TIMEZONE,
  procedures,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const [display, setDisplay] = useState("");
  const [status, setStatus] = useState("completed");
  const [occurredAtLocal, setOccurredAtLocal] = useState(
    nowWallClockInTz(timeZone),
  );
  const [performerLabel, setPerformerLabel] = useState("");
  const [outcome, setOutcome] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function resetForm() {
    setDisplay("");
    setStatus("completed");
    setOccurredAtLocal(nowWallClockInTz(timeZone));
    setPerformerLabel("");
    setOutcome("");
    setNotes("");
    setEditingId(null);
    setReason("");
  }

  function load(p: ProcedureDto) {
    setEditingId(p.id);
    setDisplay(p.display);
    setStatus(p.status);
    setOccurredAtLocal(
      formatInPatientTz(p.occurredAt, "yyyy-MM-dd'T'HH:mm", timeZone),
    );
    setPerformerLabel(p.performerLabel ?? "");
    setOutcome(p.outcome ?? "");
    setNotes(p.notes ?? "");
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
      editingId ? `/api/procedures/${editingId}` : "/api/procedures",
      {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          patientId,
          display,
          status,
          occurredAtLocal,
          performerLabel,
          outcome,
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

      <section className="space-y-3 rounded-lg border border-border p-4">
        <h2 className="text-base font-medium">
          {editingId ? "Upravit výkon" : "Nový výkon"}
        </h2>
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <Label htmlFor="proc-display">Název</Label>
            <Input
              id="proc-display"
              className="min-h-11"
              value={display}
              onChange={(e) => setDisplay(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Stav</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proc-when">Čas</Label>
            <Input
              id="proc-when"
              type="datetime-local"
              className="min-h-11"
              value={occurredAtLocal}
              onChange={(e) => setOccurredAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proc-perf">Provádějící</Label>
            <Input
              id="proc-perf"
              className="min-h-11"
              value={performerLabel}
              onChange={(e) => setPerformerLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="proc-outcome">Výsledek</Label>
            <Input
              id="proc-outcome"
              className="min-h-11"
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="proc-notes">Poznámka</Label>
            <Textarea
              id="proc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        {editingId ? (
          <div className="space-y-1.5">
            <Label htmlFor="proc-reason">Důvod korekce</Label>
            <Input
              id="proc-reason"
              className="min-h-11"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        ) : null}
        <div className="chart-form-actions">
          <Button
            type="button"
            className="min-h-11"
            disabled={pending || saveState === "saving" || !display.trim()}
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
        <h2 className="text-base font-medium">Historie výkonů</h2>
        {procedures.length === 0 ? (
          <p className="text-muted-foreground text-sm">Zatím žádné výkony.</p>
        ) : (
          <ul className="space-y-2">
            {procedures.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{p.display}</span>
                    <Badge variant="secondary">
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatInPatientTz(
                      p.occurredAt,
                      "d. M. yyyy HH:mm",
                      timeZone,
                    )}
                    {p.performerLabel ? ` · ${p.performerLabel}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => load(p)}
                >
                  Upravit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
