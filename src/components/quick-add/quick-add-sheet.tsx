"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Beaker,
  Droplets,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react";

import {
  useQuickAdd,
  type QuickAddAction,
  type QuickAddPatient,
} from "@/components/quick-add/quick-add-context";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { apiFetch } from "@/lib/api/client";
import { nowWallClockInTz } from "@/lib/datetime/prague";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";

const MENU_ITEMS: Array<{
  action: Exclude<QuickAddAction, "menu">;
  label: string;
  description: string;
  icon: typeof Activity;
  status?: "available" | "roadmap";
}> = [
  {
    action: "measurement",
    label: "Měření",
    description: "Vitální funkce a tělesné míry",
    icon: Activity,
  },
  {
    action: "medication",
    label: "Užití léku",
    description: "Zaznamenat skutečné podání",
    icon: Pill,
  },
  {
    action: "symptom",
    label: "Symptom",
    description: "Intenzita, lokalita, kontext",
    icon: Stethoscope,
  },
  {
    action: "note",
    label: "Poznámka",
    description: "Klinická / deníková poznámka",
    icon: FileText,
  },
  {
    action: "lab",
    label: "Laboratorní výsledek",
    description: "Lab panel s jedním analytem",
    icon: Beaker,
    status: "available",
  },
  {
    action: "fluids",
    label: "Tekutiny",
    description: "Příjem / výdej (ml)",
    icon: Droplets,
    status: "available",
  },
];

type DefinitionLite = {
  id: string;
  key: string;
  label: string;
  category: string;
  canonicalUnit: string | null;
  allowedUnits: string[] | null;
  supportsPair: boolean;
};

type ActiveOrderLite = {
  id: string;
  medicationName: string;
  doseValue: number;
  doseUnit: string;
  route: string;
};

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function SaveFooter({
  pending,
  saveState,
  onSave,
  disabled,
  label = "Uložit",
}: {
  pending: boolean;
  saveState: "idle" | "saving" | "saved" | "failed";
  onSave: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const online = useOnlineStatus();
  const blocked = !online || disabled;

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <CannotSaveOfflineNotice />
      <div className="flex items-center justify-between gap-3">
        <p
          className={
            online
              ? "text-muted-foreground text-xs"
              : "text-destructive text-xs"
          }
          aria-live="polite"
        >
          {!online
            ? OFFLINE_CANNOT_SAVE_MESSAGE
            : saveState === "saving"
              ? "Ukládám…"
              : saveState === "saved"
                ? "Uloženo"
                : saveState === "failed"
                  ? "Uložení selhalo"
                  : "Vyžaduje explicitní uložení"}
        </p>
        <Button
          type="button"
          onClick={onSave}
          disabled={pending || blocked}
          size="lg"
          className="min-h-11 min-w-28"
        >
          {label}
        </Button>
      </div>
    </div>
  );
}

function QuickAddFormBody({
  action,
  patient,
  vitalDefinitions,
  labDefinitions,
  activeOrders,
  onSaved,
  onBack,
}: {
  action: QuickAddAction;
  patient: QuickAddPatient;
  vitalDefinitions: DefinitionLite[];
  labDefinitions: DefinitionLite[];
  activeOrders: ActiveOrderLite[];
  onSaved: () => void;
  onBack: () => void;
}) {
  const timeZone = patient.timezone;
  const measurementDefs =
    action === "lab" ? labDefinitions : vitalDefinitions;
  const firstDef = measurementDefs[0];
  const firstOrder = activeOrders[0];

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [occurredAtLocal, setOccurredAtLocal] = useState(
    nowWallClockInTz(timeZone),
  );

  const [definitionId, setDefinitionId] = useState(firstDef?.id ?? "");
  const selectedDef =
    measurementDefs.find((d) => d.id === definitionId) ?? firstDef;
  const [numericValue, setNumericValue] = useState("");
  const [secondaryValue, setSecondaryValue] = useState("");
  const [unit, setUnit] = useState(firstDef?.canonicalUnit ?? "");
  const [context, setContext] = useState("");

  const [orderId, setOrderId] = useState(firstOrder?.id ?? "");
  const [oneOffName, setOneOffName] = useState("");
  const [doseValue, setDoseValue] = useState(
    firstOrder ? String(firstOrder.doseValue) : "1",
  );
  const [doseUnit, setDoseUnit] = useState(firstOrder?.doseUnit ?? "tbl");
  const [adminStatus, setAdminStatus] = useState("taken");
  const [adminNotes, setAdminNotes] = useState("");
  const [idempotencyKey] = useState(newIdempotencyKey);

  const [symptom, setSymptom] = useState("");
  const [intensity, setIntensity] = useState("5");
  const [location, setLocation] = useState("");
  const [symptomNotes, setSymptomNotes] = useState("");

  const [noteType, setNoteType] = useState("DIARY");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [fluidDirection, setFluidDirection] = useState<"intake" | "output">(
    "intake",
  );
  const [fluidCategory, setFluidCategory] = useState("oral");
  const [fluidAmountMl, setFluidAmountMl] = useState("250");
  const [fluidNotes, setFluidNotes] = useState("");
  const [labTitle, setLabTitle] = useState("Laboratorní výsledek");
  const [labRefLow, setLabRefLow] = useState("");
  const [labRefHigh, setLabRefHigh] = useState("");

  function selectDefinition(id: string) {
    setDefinitionId(id);
    const def = measurementDefs.find((d) => d.id === id);
    setUnit(def?.canonicalUnit ?? "");
    setNumericValue("");
    setSecondaryValue("");
  }

  async function saveObservation() {
    if (!definitionId) {
      setError("Vyberte veličinu.");
      return;
    }
    setSaveState("saving");
    setError(null);
    const res = await apiFetch("/api/observations", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        definitionId,
        numericValue: numericValue === "" ? null : Number(numericValue),
        secondaryNumericValue:
          secondaryValue === "" ? null : Number(secondaryValue),
        unit,
        occurredAtLocal,
        context: context || undefined,
        source: "manual",
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení měření selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    startTransition(() => onSaved());
  }

  async function saveLabPanel() {
    if (!definitionId && !labTitle.trim()) {
      setError("Vyberte analyt nebo zadejte název.");
      return;
    }
    if (numericValue === "" && !context.trim()) {
      // context reused as optional text value for free-text lab
    }
    const analyte = selectedDef?.label ?? labTitle.trim();
    if (!analyte) {
      setError("Vyberte analyt.");
      return;
    }
    if (numericValue === "") {
      setError("Zadejte hodnotu.");
      return;
    }
    setSaveState("saving");
    setError(null);
    const res = await apiFetch("/api/lab-panels", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        title: labTitle.trim() || analyte,
        collectedAtLocal: occurredAtLocal,
        laboratory: "",
        source: "manual",
        notes: context || "",
        results: [
          {
            analyte,
            valueNumeric: Number(numericValue),
            unit,
            referenceLow: labRefLow === "" ? null : Number(labRefLow),
            referenceHigh: labRefHigh === "" ? null : Number(labRefHigh),
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení lab výsledku selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    startTransition(() => onSaved());
  }

  async function saveFluid() {
    if (!fluidCategory.trim()) {
      setError("Zadejte kategorii.");
      return;
    }
    if (!fluidAmountMl || Number(fluidAmountMl) <= 0) {
      setError("Zadejte kladný objem v ml.");
      return;
    }
    setSaveState("saving");
    setError(null);
    const res = await apiFetch("/api/fluid-balance", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        direction: fluidDirection,
        category: fluidCategory.trim(),
        amountMl: Number(fluidAmountMl),
        occurredAtLocal,
        notes: fluidNotes || "",
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení tekutin selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    startTransition(() => onSaved());
  }

  async function saveMedication() {
    if (!orderId && !oneOffName.trim()) {
      setError("Vyberte aktivní lék nebo zadejte jednorázový název.");
      return;
    }
    setSaveState("saving");
    setError(null);
    const selectedOrder = activeOrders.find((o) => o.id === orderId);
    const res = await apiFetch("/api/medication-administrations", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        medicationOrderId: orderId || null,
        medicationNameSnapshot: orderId
          ? selectedOrder?.medicationName
          : oneOffName.trim(),
        doseValue: Number(doseValue),
        doseUnit,
        routeSnapshot: selectedOrder?.route ?? "oral",
        status: adminStatus,
        occurredAtLocal,
        notes: adminNotes || undefined,
        idempotencyKey,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení užití selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    startTransition(() => onSaved());
  }

  async function saveSymptom() {
    if (!symptom.trim()) {
      setError("Zadejte název symptomu.");
      return;
    }
    setSaveState("saving");
    setError(null);
    const res = await apiFetch("/api/symptoms", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        symptom: symptom.trim(),
        intensity: intensity === "" ? null : Number(intensity),
        intensityScale: "0-10",
        location: location || undefined,
        occurredAtLocal,
        notes: symptomNotes || undefined,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení symptomu selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    startTransition(() => onSaved());
  }

  async function saveNote() {
    if (!noteBody.trim()) {
      setError("Zadejte text poznámky.");
      return;
    }
    setSaveState("saving");
    setError(null);
    const res = await apiFetch("/api/clinical-notes", {
      method: "POST",
      body: JSON.stringify({
        patientId: patient.id,
        noteType,
        title: noteTitle || undefined,
        body: noteBody.trim(),
        occurredAtLocal,
        source: "manual",
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení poznámky selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    startTransition(() => onSaved());
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="min-h-11 px-2"
      >
        ← Zpět na nabídku
      </Button>

      {action === "measurement" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="qa-def">Veličina</Label>
            <Select value={definitionId} onValueChange={selectDefinition}>
              <SelectTrigger id="qa-def" className="min-h-11 w-full">
                <SelectValue placeholder="Vyberte" />
              </SelectTrigger>
              <SelectContent>
                {measurementDefs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedDef?.supportsPair ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="qa-sys">Systolický</Label>
                <Input
                  id="qa-sys"
                  inputMode="decimal"
                  className="min-h-11"
                  value={numericValue}
                  onChange={(e) => setNumericValue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qa-dia">Diastolický</Label>
                <Input
                  id="qa-dia"
                  inputMode="decimal"
                  className="min-h-11"
                  value={secondaryValue}
                  onChange={(e) => setSecondaryValue(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="qa-val">Hodnota</Label>
              <Input
                id="qa-val"
                inputMode="decimal"
                className="min-h-11"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-unit">Jednotka</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="qa-unit" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selectedDef?.allowedUnits ?? [unit])
                    .filter(Boolean)
                    .map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-when">Čas události</Label>
              <Input
                id="qa-when"
                type="datetime-local"
                className="min-h-11"
                value={occurredAtLocal}
                onChange={(e) => setOccurredAtLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-ctx">Kontext (volitelné)</Label>
            <Input
              id="qa-ctx"
              className="min-h-11"
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>
          <SaveFooter
            pending={pending || saveState === "saving"}
            saveState={saveState}
            onSave={() => void saveObservation()}
            disabled={!definitionId}
          />
        </>
      )}

      {action === "lab" && (
        <>
          <Alert>
            <AlertTitle>Lab panel (1 analyt)</AlertTitle>
            <AlertDescription>
              Ukládá se jako LabPanel + LabResult. Více analytů najdete v
              agendě Laboratoř. Observation lab stub zůstává dostupný přes
              Měření.
            </AlertDescription>
          </Alert>
          <div className="space-y-1.5">
            <Label htmlFor="qa-lab-title">Název panelu</Label>
            <Input
              id="qa-lab-title"
              className="min-h-11"
              value={labTitle}
              onChange={(e) => setLabTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-lab-def">Analyt</Label>
            <Select value={definitionId} onValueChange={selectDefinition}>
              <SelectTrigger id="qa-lab-def" className="min-h-11 w-full">
                <SelectValue placeholder="Vyberte" />
              </SelectTrigger>
              <SelectContent>
                {measurementDefs.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-lab-val">Hodnota</Label>
              <Input
                id="qa-lab-val"
                inputMode="decimal"
                className="min-h-11"
                value={numericValue}
                onChange={(e) => setNumericValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-lab-unit">Jednotka</Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger id="qa-lab-unit" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(selectedDef?.allowedUnits ?? [unit])
                    .filter(Boolean)
                    .map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-lab-low">Ref. low</Label>
              <Input
                id="qa-lab-low"
                inputMode="decimal"
                className="min-h-11"
                value={labRefLow}
                onChange={(e) => setLabRefLow(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-lab-high">Ref. high</Label>
              <Input
                id="qa-lab-high"
                inputMode="decimal"
                className="min-h-11"
                value={labRefHigh}
                onChange={(e) => setLabRefHigh(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-lab-when">Čas odběru</Label>
            <Input
              id="qa-lab-when"
              type="datetime-local"
              className="min-h-11"
              value={occurredAtLocal}
              onChange={(e) => setOccurredAtLocal(e.target.value)}
            />
          </div>
          <SaveFooter
            pending={pending || saveState === "saving"}
            saveState={saveState}
            onSave={() => void saveLabPanel()}
            disabled={!definitionId}
          />
        </>
      )}

      {action === "medication" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="qa-order">Aktivní medikace</Label>
            <Select
              value={orderId || "__oneoff__"}
              onValueChange={(v) => {
                if (v === "__oneoff__") {
                  setOrderId("");
                  return;
                }
                setOrderId(v);
                const o = activeOrders.find((x) => x.id === v);
                if (o) {
                  setDoseValue(String(o.doseValue));
                  setDoseUnit(o.doseUnit);
                }
              }}
            >
              <SelectTrigger id="qa-order" className="min-h-11 w-full">
                <SelectValue placeholder="Vyberte" />
              </SelectTrigger>
              <SelectContent>
                {activeOrders.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.medicationName}
                  </SelectItem>
                ))}
                <SelectItem value="__oneoff__">
                  Jednorázové užití (mimo plán)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {!orderId ? (
            <div className="space-y-1.5">
              <Label htmlFor="qa-medname">Název léku</Label>
              <Input
                id="qa-medname"
                className="min-h-11"
                value={oneOffName}
                onChange={(e) => setOneOffName(e.target.value)}
              />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-dose">Dávka</Label>
              <Input
                id="qa-dose"
                inputMode="decimal"
                className="min-h-11"
                value={doseValue}
                onChange={(e) => setDoseValue(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-dose-unit">Jednotka</Label>
              <Input
                id="qa-dose-unit"
                className="min-h-11"
                value={doseUnit}
                onChange={(e) => setDoseUnit(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-admin-status">Stav (povinné potvrzení)</Label>
              <Select value={adminStatus} onValueChange={setAdminStatus}>
                <SelectTrigger id="qa-admin-status" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taken">užito</SelectItem>
                  <SelectItem value="partially_taken">částečně</SelectItem>
                  <SelectItem value="refused">odmítnuto</SelectItem>
                  <SelectItem value="omitted">vynecháno</SelectItem>
                  <SelectItem value="delayed">odloženo</SelectItem>
                  <SelectItem value="unknown">neznámé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-med-when">Čas události</Label>
              <Input
                id="qa-med-when"
                type="datetime-local"
                className="min-h-11"
                value={occurredAtLocal}
                onChange={(e) => setOccurredAtLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-med-notes">Poznámka</Label>
            <Textarea
              id="qa-med-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </div>
          <SaveFooter
            pending={pending || saveState === "saving"}
            saveState={saveState}
            onSave={() => void saveMedication()}
            label="Potvrdit a uložit"
          />
        </>
      )}

      {action === "symptom" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="qa-symptom">Symptom</Label>
            <Input
              id="qa-symptom"
              className="min-h-11"
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              placeholder="např. bolest hlavy"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-intensity">Intenzita 0–10</Label>
              <Input
                id="qa-intensity"
                type="number"
                min={0}
                max={10}
                className="min-h-11"
                value={intensity}
                onChange={(e) => setIntensity(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-sym-when">Čas události</Label>
              <Input
                id="qa-sym-when"
                type="datetime-local"
                className="min-h-11"
                value={occurredAtLocal}
                onChange={(e) => setOccurredAtLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-loc">Lokalita</Label>
            <Input
              id="qa-loc"
              className="min-h-11"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-sym-notes">Poznámka</Label>
            <Textarea
              id="qa-sym-notes"
              value={symptomNotes}
              onChange={(e) => setSymptomNotes(e.target.value)}
            />
          </div>
          <SaveFooter
            pending={pending || saveState === "saving"}
            saveState={saveState}
            onSave={() => void saveSymptom()}
          />
        </>
      )}

      {action === "note" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-note-type">Typ</Label>
              <Select value={noteType} onValueChange={setNoteType}>
                <SelectTrigger id="qa-note-type" className="min-h-11 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIARY">Deník</SelectItem>
                  <SelectItem value="VISIT_SUMMARY">Návštěva</SelectItem>
                  <SelectItem value="MEDICATION_NOTE">Medikace</SelectItem>
                  <SelectItem value="RESULT_NOTE">Výsledek</SelectItem>
                  <SelectItem value="CARE_NOTE">Péče</SelectItem>
                  <SelectItem value="OTHER">Jiné</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-note-when">Čas události</Label>
              <Input
                id="qa-note-when"
                type="datetime-local"
                className="min-h-11"
                value={occurredAtLocal}
                onChange={(e) => setOccurredAtLocal(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-note-title">Nadpis (volitelné)</Label>
            <Input
              id="qa-note-title"
              className="min-h-11"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-note-body">Text</Label>
            <Textarea
              id="qa-note-body"
              rows={5}
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
          </div>
          <SaveFooter
            pending={pending || saveState === "saving"}
            saveState={saveState}
            onSave={() => void saveNote()}
          />
        </>
      )}

      {action === "fluids" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Směr</Label>
              <Select
                value={fluidDirection}
                onValueChange={(v) =>
                  setFluidDirection(v as "intake" | "output")
                }
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
              <Label htmlFor="qa-fluid-ml">Objem (ml)</Label>
              <Input
                id="qa-fluid-ml"
                inputMode="decimal"
                className="min-h-11"
                value={fluidAmountMl}
                onChange={(e) => setFluidAmountMl(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-fluid-cat">Kategorie</Label>
            <Input
              id="qa-fluid-cat"
              className="min-h-11"
              value={fluidCategory}
              onChange={(e) => setFluidCategory(e.target.value)}
              placeholder="perorální / IV / moč / …"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-fluid-when">Čas</Label>
            <Input
              id="qa-fluid-when"
              type="datetime-local"
              className="min-h-11"
              value={occurredAtLocal}
              onChange={(e) => setOccurredAtLocal(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qa-fluid-notes">Poznámka</Label>
            <Textarea
              id="qa-fluid-notes"
              value={fluidNotes}
              onChange={(e) => setFluidNotes(e.target.value)}
            />
          </div>
          <SaveFooter
            pending={pending || saveState === "saving"}
            saveState={saveState}
            onSave={() => void saveFluid()}
          />
        </>
      )}
    </div>
  );
}

export function QuickAddSheet() {
  const router = useRouter();
  const {
    open,
    action,
    sessionKey,
    patient,
    vitalDefinitions,
    labDefinitions,
    activeOrders,
    loading,
    closeQuickAdd,
    setAction,
    refreshCatalog,
  } = useQuickAdd();

  const title = useMemo(() => {
    switch (action) {
      case "measurement":
        return "Přidat měření";
      case "medication":
        return "Zaznamenat užití léku";
      case "symptom":
        return "Zaznamenat symptom";
      case "note":
        return "Přidat poznámku";
      case "lab":
        return "Laboratorní výsledek";
      case "fluids":
        return "Tekutiny";
      default:
        return "Rychlé přidání";
    }
  }, [action]);

  function handleSaved() {
    void refreshCatalog();
    router.refresh();
    window.setTimeout(() => {
      closeQuickAdd();
    }, 450);
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) closeQuickAdd();
      }}
    >
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl p-0 sm:mx-auto sm:max-w-lg"
        showCloseButton
      >
        <SheetHeader className="border-b border-border">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            {patient
              ? `Pacient: ${patient.preferredName || patient.displayName}`
              : "Nejdřív dokončete pacientský profil."}
            {" · "}
            Zkratka <kbd className="rounded border px-1 text-xs">N</kbd>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {!patient && !loading ? (
            <p className="text-muted-foreground text-sm">
              Bez pacienta nelze přidávat záznamy. Dokončete setup / Nastavení.
            </p>
          ) : null}

          {action === "menu" ? (
            <ul className="grid gap-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.action}>
                    <button
                      type="button"
                      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left hover:bg-muted/60"
                      onClick={() => setAction(item.action)}
                    >
                      <span className="bg-muted flex size-10 items-center justify-center rounded-lg">
                        <Icon className="size-5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          {item.status === "available" ? (
                            <Badge variant="secondary">dostupné</Badge>
                          ) : null}
                          {item.status === "roadmap" ? (
                            <Badge variant="outline">Fáze 9</Badge>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {action !== "menu" && patient ? (
            <QuickAddFormBody
              key={`${sessionKey}-${action}`}
              action={action}
              patient={patient}
              vitalDefinitions={vitalDefinitions}
              labDefinitions={labDefinitions}
              activeOrders={activeOrders}
              onSaved={handleSaved}
              onBack={() => setAction("menu")}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
