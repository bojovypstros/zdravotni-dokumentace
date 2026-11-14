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

export type EncounterDto = {
  id: string;
  patientId: string;
  type: string;
  title: string;
  startAt: string;
  endAt: string | null;
  status: string;
  facilityLabel: string | null;
  reason: string | null;
  notes: string | null;
};

type Props = {
  patientId: string;
  timeZone?: string;
  encounters: EncounterDto[];
};

const TYPE_LABELS: Record<string, string> = {
  hospitalization: "Hospitalizace",
  outpatient: "Ambulantní",
  emergency: "Urgentní",
  self_monitoring: "Vlastní sledování",
  other: "Jiné",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "plánováno",
  in_progress: "probíhá",
  completed: "ukončeno",
  cancelled: "zrušeno",
};

export function EncountersPanel({
  patientId,
  timeZone = DEFAULT_TIMEZONE,
  encounters,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const [type, setType] = useState("outpatient");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("planned");
  const [startAtLocal, setStartAtLocal] = useState(nowWallClockInTz(timeZone));
  const [endAtLocal, setEndAtLocal] = useState("");
  const [facilityLabel, setFacilityLabel] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");

  function resetForm() {
    setType("outpatient");
    setTitle("");
    setStatus("planned");
    setStartAtLocal(nowWallClockInTz(timeZone));
    setEndAtLocal("");
    setFacilityLabel("");
    setReason("");
    setNotes("");
    setEditingId(null);
    setCorrectionReason("");
  }

  function load(e: EncounterDto) {
    setEditingId(e.id);
    setType(e.type);
    setTitle(e.title);
    setStatus(e.status);
    setStartAtLocal(
      formatInPatientTz(e.startAt, "yyyy-MM-dd'T'HH:mm", timeZone),
    );
    setEndAtLocal(
      e.endAt
        ? formatInPatientTz(e.endAt, "yyyy-MM-dd'T'HH:mm", timeZone)
        : "",
    );
    setFacilityLabel(e.facilityLabel ?? "");
    setReason(e.reason ?? "");
    setNotes(e.notes ?? "");
    setCorrectionReason("");
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
      editingId ? `/api/encounters/${editingId}` : "/api/encounters",
      {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          patientId,
          type,
          title,
          status,
          startAtLocal,
          endAtLocal: endAtLocal || "",
          facilityLabel,
          reason,
          notes,
          correctionReason: editingId ? correctionReason : "",
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
          {editingId ? "Upravit událost" : "Nová událost / pobyt"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="enc-title">Název</Label>
            <Input
              id="enc-title"
              className="min-h-11"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="min-h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="enc-start">Začátek</Label>
            <Input
              id="enc-start"
              type="datetime-local"
              className="min-h-11"
              value={startAtLocal}
              onChange={(e) => setStartAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enc-end">Konec (volitelné)</Label>
            <Input
              id="enc-end"
              type="datetime-local"
              className="min-h-11"
              value={endAtLocal}
              onChange={(e) => setEndAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enc-fac">Zařízení</Label>
            <Input
              id="enc-fac"
              className="min-h-11"
              value={facilityLabel}
              onChange={(e) => setFacilityLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="enc-reason">Důvod</Label>
            <Input
              id="enc-reason"
              className="min-h-11"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="enc-notes">Poznámka</Label>
            <Textarea
              id="enc-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        {editingId ? (
          <div className="space-y-1.5">
            <Label htmlFor="enc-corr">Důvod korekce</Label>
            <Input
              id="enc-corr"
              className="min-h-11"
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
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
        <h2 className="text-base font-medium">Události</h2>
        {encounters.length === 0 ? (
          <p className="text-muted-foreground text-sm">Zatím žádné události.</p>
        ) : (
          <ul className="space-y-2">
            {encounters.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{e.title}</span>
                    <Badge variant="secondary">
                      {TYPE_LABELS[e.type] ?? e.type}
                    </Badge>
                    <Badge variant="outline">
                      {STATUS_LABELS[e.status] ?? e.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatInPatientTz(e.startAt, "d. M. yyyy HH:mm", timeZone)}
                    {e.endAt
                      ? ` – ${formatInPatientTz(e.endAt, "d. M. yyyy HH:mm", timeZone)}`
                      : ""}
                    {e.facilityLabel ? ` · ${e.facilityLabel}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => load(e)}
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
