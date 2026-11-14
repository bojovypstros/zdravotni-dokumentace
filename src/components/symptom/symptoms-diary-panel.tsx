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
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import {
  DEFAULT_TIMEZONE,
  formatInPatientTz,
  nowWallClockInTz,
} from "@/lib/datetime/prague";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

export type DiaryScaleDto = {
  id: string;
  key: string;
  label: string;
  minValue: number;
  maxValue: number;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  isEnabled: boolean;
  patientId: string | null;
};

export type DiaryScaleReadingDto = {
  id: string;
  patientId: string;
  values: Record<string, number>;
  occurredAt: string;
  recordedAt: string;
  notes: string | null;
};

export type SymptomEntryDto = {
  id: string;
  patientId: string;
  symptom: string;
  intensity: number | null;
  intensityScale: string | null;
  location: string | null;
  character: string | null;
  onsetAt: string | null;
  endedAt: string | null;
  occurredAt: string;
  recordedAt: string;
  context: string | null;
  notes: string | null;
};

export type ClinicalNoteDto = {
  id: string;
  patientId: string;
  noteType: string;
  title: string | null;
  body: string;
  occurredAt: string;
  recordedAt: string;
  source: string;
};

type TabKey = "diary" | "symptoms" | "notes" | "scales";

type Props = {
  patientId: string;
  timeZone?: string;
  scales: DiaryScaleDto[];
  readings: DiaryScaleReadingDto[];
  symptoms: SymptomEntryDto[];
  notes: ClinicalNoteDto[];
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  DIARY: "Deník",
  VISIT_SUMMARY: "Shrnutí návštěvy",
  MEDICATION_NOTE: "Poznámka k lékům",
  RESULT_NOTE: "Poznámka k výsledku",
  CARE_NOTE: "Péče",
  OTHER: "Jiné",
};

const NOTE_TYPES = Object.keys(NOTE_TYPE_LABELS);

export function SymptomsDiaryPanel({
  patientId,
  timeZone = DEFAULT_TIMEZONE,
  scales,
  readings,
  symptoms,
  notes,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>("diary");
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const enabledScales = useMemo(
    () => scales.filter((s) => s.isEnabled),
    [scales],
  );
  const labelByKey = useMemo(
    () => new Map(scales.map((s) => [s.key, s.label])),
    [scales],
  );

  // --- Diary scales form ---
  const [scaleValues, setScaleValues] = useState<Record<string, string>>({});
  const [diaryOccurred, setDiaryOccurred] = useState(
    nowWallClockInTz(timeZone),
  );
  const [diaryNotes, setDiaryNotes] = useState("");
  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);
  const [readingReason, setReadingReason] = useState("");

  // --- Quick symptom ---
  const [symptomName, setSymptomName] = useState("");
  const [symptomIntensity, setSymptomIntensity] = useState("5");
  const [symptomLocation, setSymptomLocation] = useState("");
  const [symptomCharacter, setSymptomCharacter] = useState("");
  const [symptomContext, setSymptomContext] = useState("");
  const [symptomNotes, setSymptomNotes] = useState("");
  const [symptomOccurred, setSymptomOccurred] = useState(
    nowWallClockInTz(timeZone),
  );
  const [editingSymptomId, setEditingSymptomId] = useState<string | null>(null);
  const [symptomReason, setSymptomReason] = useState("");

  // --- Clinical note ---
  const [noteType, setNoteType] = useState("DIARY");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteOccurred, setNoteOccurred] = useState(nowWallClockInTz(timeZone));
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteReason, setNoteReason] = useState("");

  // --- Custom scale ---
  const [customKey, setCustomKey] = useState("");
  const [customLabel, setCustomLabel] = useState("");

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function postJson(url: string, body: unknown, method = "POST") {
    setSaveState("saving");
    setError(null);
    const res = await apiFetch(url, {
      method,
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!res.ok) {
      setSaveState("failed");
      throw new Error(data?.error ?? "Uložení selhalo.");
    }
    setSaveState("saved");
    return data;
  }

  function loadReading(r: DiaryScaleReadingDto) {
    setEditingReadingId(r.id);
    const next: Record<string, string> = {};
    for (const [k, v] of Object.entries(r.values)) {
      next[k] = String(v);
    }
    setScaleValues(next);
    setDiaryOccurred(
      formatInPatientTz(r.occurredAt, "yyyy-MM-dd'T'HH:mm", timeZone),
    );
    setDiaryNotes(r.notes ?? "");
    setReadingReason("");
    setTab("diary");
  }

  async function saveDiaryReading() {
    const values: Record<string, number> = {};
    for (const scale of enabledScales) {
      const raw = scaleValues[scale.key];
      if (raw === undefined || raw === "") continue;
      const n = Number(raw);
      if (!Number.isFinite(n)) {
        setError(`Neplatná hodnota pro ${scale.label}.`);
        return;
      }
      values[scale.key] = n;
    }
    if (Object.keys(values).length === 0) {
      setError("Vyplňte alespoň jednu škálu.");
      return;
    }
    try {
      const payload = {
        patientId,
        values,
        occurredAtLocal: diaryOccurred,
        notes: diaryNotes,
        reason: readingReason,
      };
      if (editingReadingId) {
        await postJson(
          `/api/diary-scale-readings/${editingReadingId}`,
          payload,
          "PATCH",
        );
      } else {
        await postJson("/api/diary-scale-readings", payload);
      }
      setEditingReadingId(null);
      setScaleValues({});
      setDiaryNotes("");
      setReadingReason("");
      setDiaryOccurred(nowWallClockInTz(timeZone));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba.");
    }
  }

  function loadSymptom(s: SymptomEntryDto) {
    setEditingSymptomId(s.id);
    setSymptomName(s.symptom);
    setSymptomIntensity(s.intensity != null ? String(s.intensity) : "");
    setSymptomLocation(s.location ?? "");
    setSymptomCharacter(s.character ?? "");
    setSymptomContext(s.context ?? "");
    setSymptomNotes(s.notes ?? "");
    setSymptomOccurred(
      formatInPatientTz(s.occurredAt, "yyyy-MM-dd'T'HH:mm", timeZone),
    );
    setSymptomReason("");
    setTab("symptoms");
  }

  async function saveSymptom() {
    if (!symptomName.trim()) {
      setError("Zadejte název symptomu.");
      return;
    }
    try {
      const intensityRaw = symptomIntensity.trim();
      const payload = {
        patientId,
        symptom: symptomName.trim(),
        intensity: intensityRaw === "" ? null : Number(intensityRaw),
        intensityScale: intensityRaw === "" ? "" : "0-10",
        location: symptomLocation,
        character: symptomCharacter,
        occurredAtLocal: symptomOccurred,
        context: symptomContext,
        notes: symptomNotes,
        reason: symptomReason,
      };
      if (editingSymptomId) {
        await postJson(`/api/symptoms/${editingSymptomId}`, payload, "PATCH");
      } else {
        await postJson("/api/symptoms", payload);
      }
      setEditingSymptomId(null);
      setSymptomName("");
      setSymptomIntensity("5");
      setSymptomLocation("");
      setSymptomCharacter("");
      setSymptomContext("");
      setSymptomNotes("");
      setSymptomReason("");
      setSymptomOccurred(nowWallClockInTz(timeZone));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba.");
    }
  }

  function loadNote(n: ClinicalNoteDto) {
    setEditingNoteId(n.id);
    setNoteType(n.noteType);
    setNoteTitle(n.title ?? "");
    setNoteBody(n.body);
    setNoteOccurred(
      formatInPatientTz(n.occurredAt, "yyyy-MM-dd'T'HH:mm", timeZone),
    );
    setNoteReason("");
    setTab("notes");
  }

  async function saveNote() {
    if (!noteBody.trim()) {
      setError("Text poznámky je povinný.");
      return;
    }
    try {
      const payload = {
        patientId,
        noteType,
        title: noteTitle,
        body: noteBody,
        occurredAtLocal: noteOccurred,
        source: "manual",
        reason: noteReason,
      };
      if (editingNoteId) {
        await postJson(`/api/clinical-notes/${editingNoteId}`, payload, "PATCH");
      } else {
        await postJson("/api/clinical-notes", payload);
      }
      setEditingNoteId(null);
      setNoteTitle("");
      setNoteBody("");
      setNoteReason("");
      setNoteOccurred(nowWallClockInTz(timeZone));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba.");
    }
  }

  async function toggleScale(scale: DiaryScaleDto, enabled: boolean) {
    try {
      await postJson(
        "/api/diary-scale-settings",
        {
          patientId,
          definitionId: scale.id,
          isEnabled: enabled,
        },
        "PUT",
      );
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba.");
    }
  }

  async function addCustomScale() {
    if (!customKey.trim() || !customLabel.trim()) {
      setError("Klíč i název vlastní škály jsou povinné.");
      return;
    }
    try {
      await postJson("/api/diary-scales", {
        patientId,
        key: customKey.trim(),
        label: customLabel.trim(),
        minValue: 0,
        maxValue: 10,
        sortOrder: 100,
      });
      setCustomKey("");
      setCustomLabel("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba.");
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: "diary", label: "Deník škál" },
    { key: "symptoms", label: "Symptomy" },
    { key: "notes", label: "Poznámky" },
    { key: "scales", label: "Nastavení škál" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Button
            key={t.key}
            type="button"
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <CannotSaveOfflineNotice />
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!online ? (
        <p className="text-destructive text-xs">{OFFLINE_CANNOT_SAVE_MESSAGE}</p>
      ) : saveState === "saved" ? (
        <p className="text-muted-foreground text-xs">Uloženo.</p>
      ) : null}
      {online && saveState === "failed" ? (
        <p className="text-destructive text-xs">Uložení selhalo.</p>
      ) : null}

      {tab === "diary" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border-border rounded-xl border p-4">
            <h2 className="mb-3 font-medium">
              {editingReadingId ? "Upravit záznam škál" : "Zapsat deník škál"}
            </h2>
            {enabledScales.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Žádné zapnuté škály — zapněte je v Nastavení škál.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {enabledScales.map((scale) => (
                  <div key={scale.id} className="grid gap-1.5">
                    <Label htmlFor={`scale-${scale.key}`}>
                      {scale.label} ({scale.minValue}–{scale.maxValue})
                    </Label>
                    <Input
                      id={`scale-${scale.key}`}
                      type="number"
                      min={scale.minValue}
                      max={scale.maxValue}
                      step={1}
                      value={scaleValues[scale.key] ?? ""}
                      onChange={(e) =>
                        setScaleValues((prev) => ({
                          ...prev,
                          [scale.key]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
                <div className="grid gap-1.5">
                  <Label htmlFor="diary-occurred">Čas</Label>
                  <Input
                    id="diary-occurred"
                    type="datetime-local"
                    value={diaryOccurred}
                    onChange={(e) => setDiaryOccurred(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="diary-notes">Poznámka</Label>
                  <Textarea
                    id="diary-notes"
                    value={diaryNotes}
                    onChange={(e) => setDiaryNotes(e.target.value)}
                    rows={2}
                  />
                </div>
                {editingReadingId ? (
                  <div className="grid gap-1.5">
                    <Label htmlFor="diary-reason">
                      Důvod korekce (volitelně → audit correction)
                    </Label>
                    <Input
                      id="diary-reason"
                      value={readingReason}
                      onChange={(e) => setReadingReason(e.target.value)}
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={pending || saveState === "saving" || !online}
                    onClick={() => void saveDiaryReading()}
                  >
                    {editingReadingId ? "Uložit korekci" : "Uložit deník"}
                  </Button>
                  {editingReadingId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingReadingId(null);
                        setScaleValues({});
                        setReadingReason("");
                      }}
                    >
                      Zrušit
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 font-medium">Historie škál</h2>
            {readings.length === 0 ? (
              <p className="text-muted-foreground text-sm">Zatím žádné záznamy.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {readings.map((r) => (
                  <li
                    key={r.id}
                    className="border-border rounded-xl border px-4 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <time className="text-sm font-medium">
                        {formatInPatientTz(
                          r.occurredAt,
                          "d. M. yyyy HH:mm",
                          timeZone,
                        )}
                      </time>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadReading(r)}
                      >
                        Upravit
                      </Button>
                    </div>
                    <p className="mt-1 text-sm">
                      {Object.entries(r.values)
                        .map(
                          ([k, v]) => `${labelByKey.get(k) ?? k} ${v}`,
                        )
                        .join(" · ")}
                    </p>
                    {r.notes ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {r.notes}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "symptoms" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border-border rounded-xl border p-4">
            <h2 className="mb-3 font-medium">
              {editingSymptomId ? "Upravit symptom" : "Rychlý zápis symptomu"}
            </h2>
            <div className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="symptom-name">Symptom</Label>
                <Input
                  id="symptom-name"
                  value={symptomName}
                  onChange={(e) => setSymptomName(e.target.value)}
                  placeholder="např. bolest hlavy"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="symptom-intensity">Intenzita (0–10)</Label>
                <Input
                  id="symptom-intensity"
                  type="number"
                  min={0}
                  max={10}
                  value={symptomIntensity}
                  onChange={(e) => setSymptomIntensity(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="symptom-location">Lokalizace</Label>
                <Input
                  id="symptom-location"
                  value={symptomLocation}
                  onChange={(e) => setSymptomLocation(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="symptom-character">Charakter</Label>
                <Input
                  id="symptom-character"
                  value={symptomCharacter}
                  onChange={(e) => setSymptomCharacter(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="symptom-context">Kontext / spouštěč</Label>
                <Input
                  id="symptom-context"
                  value={symptomContext}
                  onChange={(e) => setSymptomContext(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="symptom-occurred">Čas</Label>
                <Input
                  id="symptom-occurred"
                  type="datetime-local"
                  value={symptomOccurred}
                  onChange={(e) => setSymptomOccurred(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="symptom-notes">Poznámka</Label>
                <Textarea
                  id="symptom-notes"
                  value={symptomNotes}
                  onChange={(e) => setSymptomNotes(e.target.value)}
                  rows={2}
                />
              </div>
              {editingSymptomId ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="symptom-reason">Důvod korekce</Label>
                  <Input
                    id="symptom-reason"
                    value={symptomReason}
                    onChange={(e) => setSymptomReason(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending || saveState === "saving" || !online}
                  onClick={() => void saveSymptom()}
                >
                  {editingSymptomId ? "Uložit korekci" : "Zaznamenat symptom"}
                </Button>
                {editingSymptomId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingSymptomId(null);
                      setSymptomReason("");
                    }}
                  >
                    Zrušit
                  </Button>
                ) : null}
              </div>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-medium">Historie symptomů</h2>
            {symptoms.length === 0 ? (
              <p className="text-muted-foreground text-sm">Zatím žádné symptomy.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {symptoms.map((s) => (
                  <li
                    key={s.id}
                    className="border-border rounded-xl border px-4 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium">{s.symptom}</div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadSymptom(s)}
                      >
                        Upravit
                      </Button>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {formatInPatientTz(
                        s.occurredAt,
                        "d. M. yyyy HH:mm",
                        timeZone,
                      )}
                    </p>
                    <p className="mt-1 text-sm">
                      {[
                        s.intensity != null
                          ? `intenzita ${s.intensity}/10`
                          : null,
                        s.location,
                        s.character,
                        s.context,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border-border rounded-xl border p-4">
            <h2 className="mb-3 font-medium">
              {editingNoteId ? "Upravit poznámku" : "Nová poznámka"}
            </h2>
            <div className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label>Typ</Label>
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {NOTE_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note-title">Nadpis (volitelně)</Label>
                <Input
                  id="note-title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note-body">Text</Label>
                <Textarea
                  id="note-body"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="note-occurred">Čas</Label>
                <Input
                  id="note-occurred"
                  type="datetime-local"
                  value={noteOccurred}
                  onChange={(e) => setNoteOccurred(e.target.value)}
                />
              </div>
              {editingNoteId ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="note-reason">Důvod korekce</Label>
                  <Input
                    id="note-reason"
                    value={noteReason}
                    onChange={(e) => setNoteReason(e.target.value)}
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  disabled={pending || saveState === "saving" || !online}
                  onClick={() => void saveNote()}
                >
                  {editingNoteId ? "Uložit korekci" : "Uložit poznámku"}
                </Button>
                {editingNoteId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingNoteId(null);
                      setNoteReason("");
                    }}
                  >
                    Zrušit
                  </Button>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">
                Osobní záznam — ne oficiální lékařský zápis.
              </p>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-medium">Historie poznámek</h2>
            {notes.length === 0 ? (
              <p className="text-muted-foreground text-sm">Zatím žádné poznámky.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {notes.map((n) => (
                  <li
                    key={n.id}
                    className="border-border rounded-xl border px-4 py-3"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="font-medium">
                        {n.title?.trim() ||
                          NOTE_TYPE_LABELS[n.noteType] ||
                          n.noteType}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => loadNote(n)}
                      >
                        Upravit
                      </Button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {NOTE_TYPE_LABELS[n.noteType] ?? n.noteType}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {formatInPatientTz(
                          n.occurredAt,
                          "d. M. yyyy HH:mm",
                          timeZone,
                        )}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm">{n.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "scales" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="border-border rounded-xl border p-4">
            <h2 className="mb-3 font-medium">Zapnout / vypnout škály</h2>
            <ul className="flex flex-col gap-2">
              {scales.map((scale) => (
                <li
                  key={scale.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                >
                  <div>
                    <div className="font-medium">{scale.label}</div>
                    <div className="text-muted-foreground text-xs">
                      {scale.key} · {scale.minValue}–{scale.maxValue}
                      {scale.isSystem ? " · systémová" : " · vlastní"}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={scale.isEnabled ? "default" : "outline"}
                    disabled={pending || !online}
                    onClick={() => void toggleScale(scale, !scale.isEnabled)}
                  >
                    {scale.isEnabled ? "Zapnuto" : "Vypnuto"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>

          <section className="border-border rounded-xl border p-4">
            <h2 className="mb-3 font-medium">Vlastní škála</h2>
            <div className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="custom-key">Klíč (a-z_)</Label>
                <Input
                  id="custom-key"
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="např. appetite"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="custom-label">Název</Label>
                <Input
                  id="custom-label"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="např. Chuť k jídlu"
                />
              </div>
              <Button
                type="button"
                disabled={pending || saveState === "saving" || !online}
                onClick={() => void addCustomScale()}
              >
                Přidat škálu
              </Button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
