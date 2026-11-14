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
import {
  LAB_ORDER_PRIORITY_LABELS,
  LAB_ORDER_STATUS_LABELS,
  LAB_PANEL_GROUP_LABELS,
  LAB_REPORT_STATUS_LABELS,
  LAB_RESULT_FLAG_LABELS as FLAG_LABELS,
} from "@/lib/labels/cs";
import { OFFLINE_CANNOT_SAVE_MESSAGE } from "@/lib/network/offline";
import { resolveCatalogReferenceRange } from "@/lib/lab/reference-range";

export type LabAnalyteDefDto = {
  id: string;
  key: string;
  label: string;
  abbreviation: string | null;
  unit: string | null;
  panelGroup: string;
  sortOrder: number;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceLowFemale: number | null;
  referenceHighFemale: number | null;
  referenceLowMale: number | null;
  referenceHighMale: number | null;
  referenceText: string | null;
  sourceNote: string | null;
  isSystem: boolean;
  isActive: boolean;
};

export type LabOrderItemDto = {
  id?: string;
  analyteKey: string | null;
  analyteLabel: string;
  unit: string | null;
  sortOrder: number;
};

export type LabOrderDto = {
  id: string;
  patientId: string;
  title: string;
  status: string;
  priority: string;
  panelGroup: string | null;
  orderedAt: string | null;
  collectedAt: string | null;
  laboratory: string | null;
  indication: string | null;
  notes: string | null;
  items: LabOrderItemDto[];
  resultPanelIds: string[];
};

export type LabResultDto = {
  id?: string;
  analyteKey?: string | null;
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
  orderId: string | null;
  title: string;
  reportStatus: string;
  collectedAt: string | null;
  resultedAt: string | null;
  laboratory: string | null;
  source: string | null;
  notes: string | null;
  results: LabResultDto[];
};

type PanelPreset = {
  key: string;
  label: string;
  analyteKeys: string[];
};

type ResultDraft = {
  analyteKey: string;
  analyte: string;
  valueNumeric: string;
  valueText: string;
  unit: string;
  referenceLow: string;
  referenceHigh: string;
  flag: string;
};

type TabKey = "orders" | "results" | "ranges";

type Props = {
  patientId: string;
  patientSexAtBirth?: string | null;
  timeZone?: string;
  orders: LabOrderDto[];
  panels: LabPanelDto[];
  definitions: LabAnalyteDefDto[];
  presets: PanelPreset[];
  canManageCatalog?: boolean;
};

function emptyResult(): ResultDraft {
  return {
    analyteKey: "",
    analyte: "",
    valueNumeric: "",
    valueText: "",
    unit: "",
    referenceLow: "",
    referenceHigh: "",
    flag: "",
  };
}

function formatRange(
  low: number | null | undefined,
  high: number | null | undefined,
): string {
  if (low == null && high == null) return "—";
  return `${low ?? "…"} – ${high ?? "…"}`;
}

export function LabWorkspace({
  patientId,
  patientSexAtBirth = null,
  timeZone = DEFAULT_TIMEZONE,
  orders,
  panels,
  definitions,
  presets,
  canManageCatalog = false,
}: Props) {
  const router = useRouter();
  const online = useOnlineStatus();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabKey>("results");
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");

  const defByKey = useMemo(() => {
    const m = new Map<string, LabAnalyteDefDto>();
    for (const d of definitions) m.set(d.key, d);
    return m;
  }, [definitions]);

  // --- Žádanka form ---
  const [orderEditingId, setOrderEditingId] = useState<string | null>(null);
  const [orderTitle, setOrderTitle] = useState("");
  const [orderStatus, setOrderStatus] = useState("ordered");
  const [orderPriority, setOrderPriority] = useState("routine");
  const [orderPanelGroup, setOrderPanelGroup] = useState("");
  const [orderLaboratory, setOrderLaboratory] = useState("");
  const [orderIndication, setOrderIndication] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderAtLocal, setOrderAtLocal] = useState(nowWallClockInTz(timeZone));
  const [orderCollectedLocal, setOrderCollectedLocal] = useState("");
  const [orderItems, setOrderItems] = useState<LabOrderItemDto[]>([]);
  const [orderReason, setOrderReason] = useState("");

  // --- Výsledky form ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reportStatus, setReportStatus] = useState("final");
  const [laboratory, setLaboratory] = useState("");
  const [collectedAtLocal, setCollectedAtLocal] = useState(
    nowWallClockInTz(timeZone),
  );
  const [resultedAtLocal, setResultedAtLocal] = useState("");
  const [notes, setNotes] = useState("");
  const [results, setResults] = useState<ResultDraft[]>([emptyResult()]);
  const [reason, setReason] = useState("");
  const [fillPanelKey, setFillPanelKey] = useState("");

  // --- ADMIN ranges ---
  const [rangeEdits, setRangeEdits] = useState<
    Record<
      string,
      {
        referenceLow: string;
        referenceHigh: string;
        referenceLowFemale: string;
        referenceHighFemale: string;
        referenceLowMale: string;
        referenceHighMale: string;
        referenceText: string;
      }
    >
  >({});
  const [rangeSavingId, setRangeSavingId] = useState<string | null>(null);

  function refresh() {
    startTransition(() => router.refresh());
  }

  function resetOrderForm() {
    setOrderEditingId(null);
    setOrderTitle("");
    setOrderStatus("ordered");
    setOrderPriority("routine");
    setOrderPanelGroup("");
    setOrderLaboratory("");
    setOrderIndication("");
    setOrderNotes("");
    setOrderAtLocal(nowWallClockInTz(timeZone));
    setOrderCollectedLocal("");
    setOrderItems([]);
    setOrderReason("");
  }

  function loadOrder(o: LabOrderDto) {
    setOrderEditingId(o.id);
    setOrderTitle(o.title);
    setOrderStatus(o.status);
    setOrderPriority(o.priority);
    setOrderPanelGroup(o.panelGroup ?? "");
    setOrderLaboratory(o.laboratory ?? "");
    setOrderIndication(o.indication ?? "");
    setOrderNotes(o.notes ?? "");
    setOrderAtLocal(
      o.orderedAt
        ? formatInPatientTz(o.orderedAt, "yyyy-MM-dd'T'HH:mm", timeZone)
        : nowWallClockInTz(timeZone),
    );
    setOrderCollectedLocal(
      o.collectedAt
        ? formatInPatientTz(o.collectedAt, "yyyy-MM-dd'T'HH:mm", timeZone)
        : "",
    );
    setOrderItems(
      o.items.map((i, idx) => ({
        analyteKey: i.analyteKey,
        analyteLabel: i.analyteLabel,
        unit: i.unit,
        sortOrder: i.sortOrder ?? idx,
      })),
    );
    setOrderReason("");
    setTab("orders");
  }

  function applyOrderPreset(panelKey: string) {
    const preset = presets.find((p) => p.key === panelKey);
    if (!preset) return;
    setOrderPanelGroup(panelKey);
    setOrderTitle(preset.label);
    const nextItems: LabOrderItemDto[] = [];
    preset.analyteKeys.forEach((key, idx) => {
      const def = defByKey.get(key);
      if (!def) return;
      nextItems.push({
        analyteKey: def.key,
        analyteLabel: def.label,
        unit: def.unit,
        sortOrder: idx,
      });
    });
    setOrderItems(nextItems);
  }

  async function saveOrder() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      setSaveState("failed");
      return;
    }
    if (!orderTitle.trim() || orderItems.length === 0) {
      setError("Žádanka vyžaduje název a alespoň jeden analyt.");
      setSaveState("failed");
      return;
    }
    setError(null);
    setSaveState("saving");
    const payload = {
      patientId,
      title: orderTitle.trim(),
      status: orderStatus,
      priority: orderPriority,
      panelGroup: orderPanelGroup,
      orderedAtLocal: orderAtLocal || "",
      collectedAtLocal: orderCollectedLocal || "",
      laboratory: orderLaboratory,
      indication: orderIndication,
      notes: orderNotes,
      reason: orderEditingId ? orderReason : "",
      items: orderItems.map((i, idx) => ({
        analyteKey: i.analyteKey ?? "",
        analyteLabel: i.analyteLabel,
        unit: i.unit ?? "",
        sortOrder: idx,
      })),
    };
    const res = await apiFetch(
      orderEditingId ? `/api/lab-orders/${orderEditingId}` : "/api/lab-orders",
      {
        method: orderEditingId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení žádanky selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    resetOrderForm();
    refresh();
  }

  function resetResultForm() {
    setEditingId(null);
    setTitle("");
    setOrderId("");
    setReportStatus("final");
    setLaboratory("");
    setCollectedAtLocal(nowWallClockInTz(timeZone));
    setResultedAtLocal("");
    setNotes("");
    setResults([emptyResult()]);
    setReason("");
    setFillPanelKey("");
  }

  function snapshotFromDef(def: LabAnalyteDefDto): Pick<
    ResultDraft,
    "analyteKey" | "analyte" | "unit" | "referenceLow" | "referenceHigh"
  > {
    const snap = resolveCatalogReferenceRange(def, patientSexAtBirth as never);
    return {
      analyteKey: def.key,
      analyte: def.label,
      unit: def.unit ?? "",
      referenceLow:
        snap.referenceLow != null ? String(snap.referenceLow) : "",
      referenceHigh:
        snap.referenceHigh != null ? String(snap.referenceHigh) : "",
    };
  }

  function fillResultsFromPanel(panelKey: string) {
    const preset = presets.find((p) => p.key === panelKey);
    if (!preset) return;
    setFillPanelKey(panelKey);
    setTitle(preset.label);
    setResults(
      preset.analyteKeys
        .map((key) => {
          const def = defByKey.get(key);
          if (!def) return null;
          return { ...emptyResult(), ...snapshotFromDef(def) };
        })
        .filter((x): x is ResultDraft => x != null),
    );
  }

  function fillResultsFromOrder(o: LabOrderDto) {
    setOrderId(o.id);
    setTitle(o.title);
    setLaboratory(o.laboratory ?? "");
    setResults(
      o.items.map((item) => {
        const def = item.analyteKey
          ? defByKey.get(item.analyteKey)
          : undefined;
        if (def) {
          return { ...emptyResult(), ...snapshotFromDef(def) };
        }
        return {
          ...emptyResult(),
          analyteKey: item.analyteKey ?? "",
          analyte: item.analyteLabel,
          unit: item.unit ?? "",
        };
      }),
    );
    setTab("results");
  }

  function loadPanel(p: LabPanelDto) {
    setEditingId(p.id);
    setTitle(p.title);
    setOrderId(p.orderId ?? "");
    setReportStatus(p.reportStatus || "final");
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
        analyteKey: r.analyteKey ?? "",
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
    setTab("results");
  }

  async function saveResults() {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      setSaveState("failed");
      return;
    }
    setError(null);
    setSaveState("saving");

    const payload = {
      patientId,
      orderId: orderId || null,
      title: title.trim(),
      reportStatus,
      collectedAtLocal: collectedAtLocal || "",
      resultedAtLocal: resultedAtLocal || "",
      laboratory,
      source: "manual",
      notes,
      reason: editingId ? reason : "",
      results: results
        .filter((r) => r.analyte.trim())
        .map((r) => ({
          analyteKey: r.analyteKey || "",
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
      setError(body?.error ?? "Uložení výsledků selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    resetResultForm();
    refresh();
  }

  function rangeDraftFor(def: LabAnalyteDefDto) {
    return (
      rangeEdits[def.id] ?? {
        referenceLow: def.referenceLow != null ? String(def.referenceLow) : "",
        referenceHigh:
          def.referenceHigh != null ? String(def.referenceHigh) : "",
        referenceLowFemale:
          def.referenceLowFemale != null
            ? String(def.referenceLowFemale)
            : "",
        referenceHighFemale:
          def.referenceHighFemale != null
            ? String(def.referenceHighFemale)
            : "",
        referenceLowMale:
          def.referenceLowMale != null ? String(def.referenceLowMale) : "",
        referenceHighMale:
          def.referenceHighMale != null ? String(def.referenceHighMale) : "",
        referenceText: def.referenceText ?? "",
      }
    );
  }

  async function saveRange(def: LabAnalyteDefDto) {
    if (!online) {
      setError(OFFLINE_CANNOT_SAVE_MESSAGE);
      return;
    }
    const draft = rangeDraftFor(def);
    setRangeSavingId(def.id);
    setError(null);
    const res = await apiFetch(`/api/lab-analyte-definitions/${def.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        referenceLow:
          draft.referenceLow === "" ? null : Number(draft.referenceLow),
        referenceHigh:
          draft.referenceHigh === "" ? null : Number(draft.referenceHigh),
        referenceLowFemale:
          draft.referenceLowFemale === ""
            ? null
            : Number(draft.referenceLowFemale),
        referenceHighFemale:
          draft.referenceHighFemale === ""
            ? null
            : Number(draft.referenceHighFemale),
        referenceLowMale:
          draft.referenceLowMale === ""
            ? null
            : Number(draft.referenceLowMale),
        referenceHighMale:
          draft.referenceHighMale === ""
            ? null
            : Number(draft.referenceHighMale),
        referenceText: draft.referenceText,
      }),
    });
    setRangeSavingId(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení referenčních mezí selhalo.");
      return;
    }
    setRangeEdits((prev) => {
      const next = { ...prev };
      delete next[def.id];
      return next;
    });
    refresh();
  }

  const waitingOrders = orders.filter(
    (o) => o.status === "ordered" || o.status === "partial" || o.status === "draft",
  );

  const tabs: { key: TabKey; label: string }[] = [
    { key: "orders", label: "Žádanky" },
    { key: "results", label: "Výsledky" },
    ...(canManageCatalog
      ? [{ key: "ranges" as const, label: "Referenční meze" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {!online ? <CannotSaveOfflineNotice /> : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

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

      {tab === "orders" ? (
        <div className="space-y-6">
          <section className="space-y-3 rounded-lg border border-border p-4">
            <h2 className="text-base font-medium">
              {orderEditingId ? "Upravit žádanku" : "Nová žádanka"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Objednávka vyšetření. Výsledky se zapisují zvlášť a mohou přijít
              i bez žádanky.
            </p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => applyOrderPreset(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ord-title">Název</Label>
                <Input
                  id="ord-title"
                  className="min-h-11"
                  value={orderTitle}
                  onChange={(e) => setOrderTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stav</Label>
                <Select value={orderStatus} onValueChange={setOrderStatus}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LAB_ORDER_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priorita</Label>
                <Select value={orderPriority} onValueChange={setOrderPriority}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LAB_ORDER_PRIORITY_LABELS).map(
                      ([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-at">Datum žádanky</Label>
                <Input
                  id="ord-at"
                  type="datetime-local"
                  className="min-h-11"
                  value={orderAtLocal}
                  onChange={(e) => setOrderAtLocal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-collected">Odběr (volitelně)</Label>
                <Input
                  id="ord-collected"
                  type="datetime-local"
                  className="min-h-11"
                  value={orderCollectedLocal}
                  onChange={(e) => setOrderCollectedLocal(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-lab">Laboratoř</Label>
                <Input
                  id="ord-lab"
                  className="min-h-11"
                  value={orderLaboratory}
                  onChange={(e) => setOrderLaboratory(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ord-ind">Indikace</Label>
                <Input
                  id="ord-ind"
                  className="min-h-11"
                  value={orderIndication}
                  onChange={(e) => setOrderIndication(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Analyty ({orderItems.length})
              </h3>
              {orderItems.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Vyberte panel nebo přidejte analyt.
                </p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {orderItems.map((i, idx) => (
                    <li
                      key={`${i.analyteKey ?? i.analyteLabel}-${idx}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2"
                    >
                      <span>
                        {i.analyteLabel}
                        {i.unit ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {i.unit}
                          </span>
                        ) : null}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setOrderItems((prev) =>
                            prev.filter((_, j) => j !== idx),
                          )
                        }
                      >
                        Odebrat
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <Select
                  value="__pick__"
                  onValueChange={(key) => {
                    if (key === "__pick__") return;
                    const def = defByKey.get(key);
                    if (!def) return;
                    setOrderItems((prev) => [
                      ...prev,
                      {
                        analyteKey: def.key,
                        analyteLabel: def.label,
                        unit: def.unit,
                        sortOrder: prev.length,
                      },
                    ]);
                  }}
                >
                  <SelectTrigger className="min-h-11 w-full sm:w-72">
                    <SelectValue placeholder="+ analyt z katalogu" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__pick__" disabled>
                      + analyt z katalogu
                    </SelectItem>
                    {definitions.map((d) => (
                      <SelectItem key={d.id} value={d.key}>
                        {d.label}
                        {d.abbreviation ? ` (${d.abbreviation})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {orderEditingId ? (
              <div className="space-y-1.5">
                <Label htmlFor="ord-reason">Důvod korekce (volitelné)</Label>
                <Input
                  id="ord-reason"
                  className="min-h-11"
                  value={orderReason}
                  onChange={(e) => setOrderReason(e.target.value)}
                />
              </div>
            ) : null}
            <div className="chart-form-actions">
              <Button
                type="button"
                className="min-h-11"
                disabled={pending || saveState === "saving"}
                onClick={() => void saveOrder()}
              >
                {orderEditingId ? "Uložit žádanku" : "Vytvořit žádanku"}
              </Button>
              {orderEditingId ? (
                <Button type="button" variant="ghost" onClick={resetOrderForm}>
                  Zrušit editaci
                </Button>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium">Seznam žádanek</h2>
            {orders.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Zatím žádné žádanky.
              </p>
            ) : (
              <ul className="space-y-3">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className="space-y-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{o.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {o.orderedAt
                            ? formatInPatientTz(
                                o.orderedAt,
                                "d. M. yyyy HH:mm",
                                timeZone,
                              )
                            : "—"}
                          {o.laboratory ? ` · ${o.laboratory}` : ""}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="secondary">
                            {LAB_ORDER_STATUS_LABELS[o.status] ?? o.status}
                          </Badge>
                          <Badge variant="outline">
                            {LAB_ORDER_PRIORITY_LABELS[o.priority] ??
                              o.priority}
                          </Badge>
                          {o.status === "ordered" || o.status === "partial" ? (
                            <Badge variant="outline">Čeká na výsledky</Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(o.status === "ordered" ||
                          o.status === "partial" ||
                          o.status === "draft") && (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => fillResultsFromOrder(o)}
                          >
                            Zapsat výsledky
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => loadOrder(o)}
                        >
                          Upravit
                        </Button>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {o.items.map((i) => i.analyteLabel).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "results" ? (
        <div className="space-y-6">
          <section className="space-y-3 rounded-lg border border-border p-4">
            <h2 className="text-base font-medium">
              {editingId ? "Upravit výsledky" : "Zapsat výsledky"}
            </h2>
            <p className="text-muted-foreground text-sm">
              Naměřené hodnoty. Můžete je navázat na žádanku, nebo zapsat jako{" "}
              <strong className="font-medium">výsledek bez žádanky</strong>{" "}
              (papír / PDF). Referenční meze se při zápisu zkopírují z katalogu
              (snapshot).
            </p>
            {waitingOrders.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <span className="text-muted-foreground self-center text-xs">
                  Z žádanky:
                </span>
                {waitingOrders.slice(0, 5).map((o) => (
                  <Button
                    key={o.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => fillResultsFromOrder(o)}
                  >
                    {o.title}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <span className="text-muted-foreground self-center text-xs">
                Panel:
              </span>
              {presets.map((p) => (
                <Button
                  key={p.key}
                  type="button"
                  size="sm"
                  variant={fillPanelKey === p.key ? "default" : "outline"}
                  onClick={() => fillResultsFromPanel(p.key)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="lab-title">Název sestavy</Label>
                <Input
                  id="lab-title"
                  className="min-h-11"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Žádanka (volitelně)</Label>
                <Select
                  value={orderId || "__none__"}
                  onValueChange={(v) =>
                    setOrderId(v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="Výsledek bez žádanky" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Výsledek bez žádanky
                    </SelectItem>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.title} (
                        {LAB_ORDER_STATUS_LABELS[o.status] ?? o.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Stav výsledku</Label>
                <Select value={reportStatus} onValueChange={setReportStatus}>
                  <SelectTrigger className="min-h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LAB_REPORT_STATUS_LABELS).map(
                      ([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
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
                <Label htmlFor="lab-resulted">Čas výsledku</Label>
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
                  onClick={() =>
                    setResults((prev) => [...prev, emptyResult()])
                  }
                >
                  + analyt
                </Button>
              </div>
              {results.map((r, idx) => {
                const analyteTitle =
                  r.analyteKey && r.analyte
                    ? r.analyte
                    : definitions.find((d) => d.key === r.analyteKey)?.label;
                return (
                  <div
                    key={idx}
                    className="space-y-2 rounded-md border border-border/70 p-3"
                  >
                    <div
                      className={
                        !r.analyteKey
                          ? "grid min-w-0 gap-2 sm:grid-cols-2"
                          : "min-w-0"
                      }
                    >
                      <Select
                        value={r.analyteKey || "__custom__"}
                        onValueChange={(key) => {
                          if (key === "__custom__") {
                            setResults((prev) =>
                              prev.map((row, i) =>
                                i === idx
                                  ? { ...row, analyteKey: "", analyte: "" }
                                  : row,
                              ),
                            );
                            return;
                          }
                          const def = defByKey.get(key);
                          if (!def) return;
                          const snap = snapshotFromDef(def);
                          setResults((prev) =>
                            prev.map((row, i) =>
                              i === idx ? { ...row, ...snap } : row,
                            ),
                          );
                        }}
                      >
                        <SelectTrigger
                          className="min-h-11 h-auto w-full min-w-0 max-w-full justify-between overflow-hidden [&>[data-slot=select-value]]:block [&>[data-slot=select-value]]:min-w-0 [&>[data-slot=select-value]]:flex-1 [&>[data-slot=select-value]]:truncate"
                          title={analyteTitle || undefined}
                        >
                          <SelectValue placeholder="Analyt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom__">Vlastní…</SelectItem>
                          {definitions.map((d) => (
                            <SelectItem
                              key={d.id}
                              value={d.key}
                              title={d.label}
                              className="items-start whitespace-normal"
                            >
                              <span className="line-clamp-2">{d.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!r.analyteKey ? (
                        <Input
                          className="min-h-11 w-full min-w-0"
                          placeholder="Název analytu"
                          value={r.analyte}
                          title={r.analyte || undefined}
                          onChange={(e) =>
                            setResults((prev) =>
                              prev.map((row, i) =>
                                i === idx
                                  ? { ...row, analyte: e.target.value }
                                  : row,
                              ),
                            )
                          }
                        />
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
                              i === idx
                                ? { ...row, unit: e.target.value }
                                : row,
                            ),
                          )
                        }
                      />
                      <Input
                        className="min-h-11"
                        placeholder="Ref. dolní"
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
                        placeholder="Ref. horní"
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
                  </div>
                );
              })}
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

            <div className="chart-form-actions">
              <Button
                type="button"
                className="min-h-11"
                disabled={pending || saveState === "saving" || !title.trim()}
                onClick={() => void saveResults()}
              >
                {saveState === "saving"
                  ? "Ukládám…"
                  : editingId
                    ? "Uložit změny"
                    : "Uložit výsledky"}
              </Button>
              {editingId ? (
                <Button type="button" variant="ghost" onClick={resetResultForm}>
                  Zrušit editaci
                </Button>
              ) : null}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-medium">Sestavy výsledků</h2>
            {panels.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Zatím žádné výsledky.
              </p>
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
                          {!p.orderId ? " · bez žádanky" : ""}
                        </p>
                        <Badge variant="secondary" className="mt-1">
                          {LAB_REPORT_STATUS_LABELS[p.reportStatus] ??
                            p.reportStatus}
                        </Badge>
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
                        <li
                          key={r.id ?? r.analyte}
                          className="flex flex-wrap gap-2"
                        >
                          <span className="font-medium">{r.analyte}</span>
                          <span>
                            {r.valueNumeric != null
                              ? `${r.valueNumeric}${r.unit ? ` ${r.unit}` : ""}`
                              : (r.valueText ?? "")}
                          </span>
                          <Badge variant="secondary">
                            {FLAG_LABELS[r.flag] ?? r.flag}
                          </Badge>
                          {r.referenceLow != null ||
                          r.referenceHigh != null ? (
                            <span className="text-muted-foreground text-xs">
                              ref {formatRange(r.referenceLow, r.referenceHigh)}
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
      ) : null}

      {tab === "ranges" && canManageCatalog ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-medium">
              Referenční meze (výchozí)
            </h2>
            <p className="text-muted-foreground text-sm">
              Aplikační defaulty pro dospělé — editovatelné jen vrchním
              lékařem. Změna katalogu nemění již uložené výsledky (snapshot).
              Pediatrické meze dle věku nastavte ručně zde.
            </p>
          </div>
          {(["ko", "biochemie", "other"] as const).map((group) => {
            const rows = definitions.filter((d) => d.panelGroup === group);
            if (rows.length === 0) return null;
            return (
              <div key={group} className="space-y-2">
                <h3 className="text-sm font-medium">
                  {LAB_PANEL_GROUP_LABELS[group] ?? group}
                </h3>
                <ul className="space-y-3">
                  {rows.map((def) => {
                    const draft = rangeDraftFor(def);
                    return (
                      <li
                        key={def.id}
                        className="space-y-2 rounded-lg border border-border p-3"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {def.label}
                              {def.abbreviation ? (
                                <span className="text-muted-foreground font-normal">
                                  {" "}
                                  ({def.abbreviation})
                                </span>
                              ) : null}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {def.unit ?? "—"}
                              {def.sourceNote ? ` · ${def.sourceNote}` : ""}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            disabled={rangeSavingId === def.id}
                            onClick={() => void saveRange(def)}
                          >
                            {rangeSavingId === def.id
                              ? "Ukládám…"
                              : "Uložit meze"}
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Společné dolní</Label>
                            <Input
                              className="min-h-10"
                              inputMode="decimal"
                              value={draft.referenceLow}
                              onChange={(e) =>
                                setRangeEdits((prev) => ({
                                  ...prev,
                                  [def.id]: {
                                    ...draft,
                                    referenceLow: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Společné horní</Label>
                            <Input
                              className="min-h-10"
                              inputMode="decimal"
                              value={draft.referenceHigh}
                              onChange={(e) =>
                                setRangeEdits((prev) => ({
                                  ...prev,
                                  [def.id]: {
                                    ...draft,
                                    referenceHigh: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Text meze</Label>
                            <Input
                              className="min-h-10"
                              value={draft.referenceText}
                              onChange={(e) =>
                                setRangeEdits((prev) => ({
                                  ...prev,
                                  [def.id]: {
                                    ...draft,
                                    referenceText: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Ženy dolní</Label>
                            <Input
                              className="min-h-10"
                              inputMode="decimal"
                              value={draft.referenceLowFemale}
                              onChange={(e) =>
                                setRangeEdits((prev) => ({
                                  ...prev,
                                  [def.id]: {
                                    ...draft,
                                    referenceLowFemale: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Ženy horní</Label>
                            <Input
                              className="min-h-10"
                              inputMode="decimal"
                              value={draft.referenceHighFemale}
                              onChange={(e) =>
                                setRangeEdits((prev) => ({
                                  ...prev,
                                  [def.id]: {
                                    ...draft,
                                    referenceHighFemale: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="hidden sm:block" />
                          <div className="space-y-1">
                            <Label className="text-xs">Muži dolní</Label>
                            <Input
                              className="min-h-10"
                              inputMode="decimal"
                              value={draft.referenceLowMale}
                              onChange={(e) =>
                                setRangeEdits((prev) => ({
                                  ...prev,
                                  [def.id]: {
                                    ...draft,
                                    referenceLowMale: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Muži horní</Label>
                            <Input
                              className="min-h-10"
                              inputMode="decimal"
                              value={draft.referenceHighMale}
                              onChange={(e) =>
                                setRangeEdits((prev) => ({
                                  ...prev,
                                  [def.id]: {
                                    ...draft,
                                    referenceHighMale: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
