"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

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
import { apiFetch } from "@/lib/api/client";
import {
  DEFAULT_TIMEZONE,
  formatInPatientTz,
  nowWallClockInTz,
} from "@/lib/datetime/prague";

export type MedicationOrderDto = {
  id: string;
  patientId: string;
  medicationName: string;
  activeIngredient: string | null;
  strengthValue: number | null;
  strengthUnit: string | null;
  form: string | null;
  doseValue: number;
  doseUnit: string;
  route: string;
  regimen: string;
  frequencyText: string | null;
  scheduledTimes: string[] | null;
  instructions: string | null;
  indication: string | null;
  startAt: string;
  endAt: string | null;
  status: string;
  sourceType: string;
  sourceLabel: string | null;
};

export type MedicationAdministrationDto = {
  id: string;
  patientId: string;
  medicationOrderId: string | null;
  medicationNameSnapshot: string;
  doseValue: number;
  doseUnit: string;
  routeSnapshot: string;
  status: string;
  occurredAt: string;
  recordedAt: string;
  reason: string | null;
  notes: string | null;
  idempotencyKey: string;
};

type TabKey = "active" | "history" | "administrations";

type Props = {
  patientId: string;
  timeZone?: string;
  orders: MedicationOrderDto[];
  administrations: MedicationAdministrationDto[];
};

const ROUTE_LABELS: Record<string, string> = {
  oral: "perorální",
  sublingual: "sublingvální",
  topical: "kožní",
  inhalation: "inhalace",
  injection: "injekční",
  infusion: "infuzní",
  ophthalmic: "oční",
  otic: "ušní",
  rectal: "rektální",
  other: "jiná",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "návrh",
  active: "aktivní",
  paused: "pozastavená",
  completed: "ukončená",
  discontinued: "vysazená",
  cancelled: "zrušená",
};

const ADMIN_STATUS_LABELS: Record<string, string> = {
  taken: "užito",
  partially_taken: "částečně",
  refused: "odmítnuto",
  omitted: "vynecháno",
  delayed: "odloženo",
  unknown: "neznámé",
};

const REGIMEN_LABELS: Record<string, string> = {
  scheduled: "pravidelný",
  prn: "dle potřeby (PRN)",
  once: "jednorázový",
  course: "kúra",
  other: "jiný",
};

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function MedicationsPanel({
  patientId,
  timeZone = DEFAULT_TIMEZONE,
  orders,
  administrations,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "failed"
  >("idle");
  const [tab, setTab] = useState<TabKey>("active");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(
    orders.find((o) => o.status === "active")?.id ?? orders[0]?.id ?? null,
  );

  const [orderForm, setOrderForm] = useState({
    medicationName: "",
    activeIngredient: "",
    strengthValue: "",
    strengthUnit: "mg",
    form: "tableta",
    doseValue: "1",
    doseUnit: "tbl",
    route: "oral",
    regimen: "scheduled",
    frequencyText: "1× denně",
    instructions: "",
    indication: "",
    startAtLocal: nowWallClockInTz(timeZone),
    status: "active",
    sourceType: "patient_recorded_plan",
  });

  const [adminForm, setAdminForm] = useState({
    medicationOrderId: "",
    status: "taken",
    doseValue: "",
    doseUnit: "",
    routeSnapshot: "oral",
    occurredAtLocal: nowWallClockInTz(timeZone),
    reason: "",
    notes: "",
    idempotencyKey: newIdempotencyKey(),
  });

  const activeOrders = useMemo(
    () => orders.filter((o) => o.status === "active" || o.status === "paused"),
    [orders],
  );
  const historicalOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.status === "completed" ||
          o.status === "discontinued" ||
          o.status === "cancelled" ||
          o.status === "draft",
      ),
    [orders],
  );

  const selectedOrder =
    orders.find((o) => o.id === selectedOrderId) ?? null;

  const orderAdmins = useMemo(() => {
    if (!selectedOrderId) return [];
    return administrations.filter((a) => a.medicationOrderId === selectedOrderId);
  }, [administrations, selectedOrderId]);

  function refresh() {
    startTransition(() => router.refresh());
  }

  async function createOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaveState("saving");
    const strengthNum = orderForm.strengthValue
      ? Number(orderForm.strengthValue)
      : null;
    const res = await apiFetch("/api/medication-orders", {
      method: "POST",
      body: JSON.stringify({
        patientId,
        medicationName: orderForm.medicationName,
        activeIngredient: orderForm.activeIngredient || undefined,
        strengthValue: strengthNum,
        strengthUnit: orderForm.strengthUnit || undefined,
        form: orderForm.form || undefined,
        doseValue: Number(orderForm.doseValue),
        doseUnit: orderForm.doseUnit,
        route: orderForm.route,
        regimen: orderForm.regimen,
        frequencyText: orderForm.frequencyText || undefined,
        instructions: orderForm.instructions || undefined,
        indication: orderForm.indication || undefined,
        startAtLocal: orderForm.startAtLocal,
        status: orderForm.status,
        sourceType: orderForm.sourceType,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení ordinace selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    setOrderForm((f) => ({
      ...f,
      medicationName: "",
      activeIngredient: "",
      instructions: "",
      indication: "",
      startAtLocal: nowWallClockInTz(timeZone),
    }));
    refresh();
  }

  function prepAdminFromOrder(order: MedicationOrderDto) {
    setSelectedOrderId(order.id);
    setAdminForm({
      medicationOrderId: order.id,
      status: "taken",
      doseValue: String(order.doseValue),
      doseUnit: order.doseUnit,
      routeSnapshot: order.route,
      occurredAtLocal: nowWallClockInTz(timeZone),
      reason: "",
      notes: "",
      idempotencyKey: newIdempotencyKey(),
    });
    setTab("administrations");
  }

  async function recordAdministration(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!adminForm.medicationOrderId && !adminForm.doseValue) {
      setError("Vyberte ordinaci nebo vyplňte dávku.");
      return;
    }
    setSaveState("saving");
    const res = await apiFetch("/api/medication-administrations", {
      method: "POST",
      body: JSON.stringify({
        patientId,
        medicationOrderId: adminForm.medicationOrderId || null,
        doseValue: adminForm.doseValue
          ? Number(adminForm.doseValue)
          : undefined,
        doseUnit: adminForm.doseUnit || undefined,
        routeSnapshot: adminForm.routeSnapshot || undefined,
        status: adminForm.status,
        occurredAtLocal: adminForm.occurredAtLocal,
        reason: adminForm.reason || undefined,
        notes: adminForm.notes || undefined,
        idempotencyKey: adminForm.idempotencyKey,
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Uložení podání selhalo.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    setAdminForm((f) => ({
      ...f,
      reason: "",
      notes: "",
      occurredAtLocal: nowWallClockInTz(timeZone),
      idempotencyKey: newIdempotencyKey(),
    }));
    refresh();
  }

  async function setOrderStatus(order: MedicationOrderDto, status: string) {
    setError(null);
    setSaveState("saving");
    const startLocal = formatInPatientTz(
      order.startAt,
      "yyyy-MM-dd'T'HH:mm",
      timeZone,
    );
    const endLocal = order.endAt
      ? formatInPatientTz(order.endAt, "yyyy-MM-dd'T'HH:mm", timeZone)
      : "";
    const res = await apiFetch(`/api/medication-orders/${order.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        patientId: order.patientId,
        medicationName: order.medicationName,
        activeIngredient: order.activeIngredient ?? "",
        strengthValue: order.strengthValue,
        strengthUnit: order.strengthUnit ?? "",
        form: order.form ?? "",
        doseValue: order.doseValue,
        doseUnit: order.doseUnit,
        route: order.route,
        regimen: order.regimen,
        frequencyText: order.frequencyText ?? "",
        scheduledTimes: order.scheduledTimes,
        instructions: order.instructions ?? "",
        indication: order.indication ?? "",
        startAtLocal: startLocal,
        endAtLocal: endLocal,
        status,
        sourceType: order.sourceType,
        sourceLabel: order.sourceLabel ?? "",
      }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(body?.error ?? "Změna stavu selhala.");
      setSaveState("failed");
      return;
    }
    setSaveState("saved");
    refresh();
  }

  function OrderCard({ order }: { order: MedicationOrderDto }) {
    return (
      <li className="border-border rounded-xl border px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="font-medium">{order.medicationName}</div>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {order.doseValue} {order.doseUnit}
              {order.strengthValue != null
                ? ` · ${order.strengthValue} ${order.strengthUnit ?? ""}`
                : ""}
              {order.form ? ` · ${order.form}` : ""}
              {" · "}
              {ROUTE_LABELS[order.route] ?? order.route}
              {" · "}
              {REGIMEN_LABELS[order.regimen] ?? order.regimen}
            </p>
            {order.frequencyText ? (
              <p className="text-muted-foreground text-xs">
                {order.frequencyText}
              </p>
            ) : null}
          </div>
          <Badge variant="secondary">
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">
          ordinace ≠ podání · od{" "}
          {formatInPatientTz(order.startAt, "d. M. yyyy", timeZone)}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => prepAdminFromOrder(order)}
            disabled={pending}
          >
            Zaznamenat užití
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setSelectedOrderId(order.id)}
          >
            Detail
          </Button>
          {order.status === "active" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setOrderStatus(order, "discontinued")}
            >
              Vysadit
            </Button>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground text-sm">
        Ordinace a skutečné užití jsou oddělené. Plánovaná dávka se nikdy
        neoznačí jako užitá automaticky.
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Chyba</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {saveState === "saved" ? (
        <p className="text-muted-foreground text-xs">Uloženo.</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["active", "Aktivní"],
            ["history", "Historie"],
            ["administrations", "Podání"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            size="sm"
            variant={tab === key ? "default" : "outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "active" ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Aktivní ordinace</h2>
          {activeOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Žádná aktivní ordinace. Přidejte níže (nevytvoří podání).
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activeOrders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </ul>
          )}

          <form
            onSubmit={createOrder}
            className="border-border mt-2 flex flex-col gap-3 rounded-xl border p-4"
          >
            <h3 className="font-medium">Nová ordinace</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="med-name">Název přípravku</Label>
                <Input
                  id="med-name"
                  required
                  value={orderForm.medicationName}
                  onChange={(e) =>
                    setOrderForm((f) => ({
                      ...f,
                      medicationName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="med-ingredient">Účinná látka</Label>
                <Input
                  id="med-ingredient"
                  value={orderForm.activeIngredient}
                  onChange={(e) =>
                    setOrderForm((f) => ({
                      ...f,
                      activeIngredient: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="med-form">Léková forma</Label>
                <Input
                  id="med-form"
                  value={orderForm.form}
                  onChange={(e) =>
                    setOrderForm((f) => ({ ...f, form: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="med-strength">Síla</Label>
                <div className="flex gap-2">
                  <Input
                    id="med-strength"
                    type="number"
                    step="any"
                    value={orderForm.strengthValue}
                    onChange={(e) =>
                      setOrderForm((f) => ({
                        ...f,
                        strengthValue: e.target.value,
                      }))
                    }
                  />
                  <Input
                    className="w-24"
                    value={orderForm.strengthUnit}
                    onChange={(e) =>
                      setOrderForm((f) => ({
                        ...f,
                        strengthUnit: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="med-dose">Dávka</Label>
                <div className="flex gap-2">
                  <Input
                    id="med-dose"
                    type="number"
                    step="any"
                    required
                    value={orderForm.doseValue}
                    onChange={(e) =>
                      setOrderForm((f) => ({
                        ...f,
                        doseValue: e.target.value,
                      }))
                    }
                  />
                  <Input
                    className="w-24"
                    required
                    value={orderForm.doseUnit}
                    onChange={(e) =>
                      setOrderForm((f) => ({
                        ...f,
                        doseUnit: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Cesta podání</Label>
                <Select
                  value={orderForm.route}
                  onValueChange={(v) =>
                    setOrderForm((f) => ({ ...f, route: v ?? "oral" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROUTE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Režim</Label>
                <Select
                  value={orderForm.regimen}
                  onValueChange={(v) =>
                    setOrderForm((f) => ({ ...f, regimen: v ?? "scheduled" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REGIMEN_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="med-freq">Frekvence</Label>
                <Input
                  id="med-freq"
                  value={orderForm.frequencyText}
                  onChange={(e) =>
                    setOrderForm((f) => ({
                      ...f,
                      frequencyText: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="med-start">Začátek</Label>
                <Input
                  id="med-start"
                  type="datetime-local"
                  required
                  value={orderForm.startAtLocal}
                  onChange={(e) =>
                    setOrderForm((f) => ({
                      ...f,
                      startAtLocal: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="med-indication">Indikace</Label>
                <Input
                  id="med-indication"
                  value={orderForm.indication}
                  onChange={(e) =>
                    setOrderForm((f) => ({
                      ...f,
                      indication: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="med-instructions">Instrukce</Label>
                <Textarea
                  id="med-instructions"
                  value={orderForm.instructions}
                  onChange={(e) =>
                    setOrderForm((f) => ({
                      ...f,
                      instructions: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <Button type="submit" disabled={pending || saveState === "saving"}>
              Uložit ordinaci
            </Button>
          </form>
        </section>
      ) : null}

      {tab === "history" ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Historie ordinací</h2>
          {historicalOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Zatím žádné ukončené ani vysazené ordinace.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {historicalOrders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "administrations" ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Zaznamenat užití</h2>
          <p className="text-muted-foreground text-sm">
            Potvrďte skutečnou dávku a čas. Stav „vynecháno“ není totéž co
            „užito“. Opakované odeslání se stejným klíčem nevytvoří duplicitu.
          </p>

          <form
            onSubmit={recordAdministration}
            className="border-border flex flex-col gap-3 rounded-xl border p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label>Ordinace</Label>
                <Select
                  value={adminForm.medicationOrderId || "__none__"}
                  onValueChange={(v) => {
                    const id = !v || v === "__none__" ? "" : v;
                    const order = orders.find((o) => o.id === id);
                    setAdminForm((f) => ({
                      ...f,
                      medicationOrderId: id,
                      doseValue: order
                        ? String(order.doseValue)
                        : f.doseValue,
                      doseUnit: order ? order.doseUnit : f.doseUnit,
                      routeSnapshot: order ? order.route : f.routeSnapshot,
                      idempotencyKey: newIdempotencyKey(),
                    }));
                    if (id) setSelectedOrderId(id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Vyberte ordinaci" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— bez vazby —</SelectItem>
                    {orders.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.medicationName} ({STATUS_LABELS[o.status]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Stav podání</Label>
                <Select
                  value={adminForm.status}
                  onValueChange={(v) =>
                    setAdminForm((f) => ({
                      ...f,
                      status: v ?? "taken",
                      idempotencyKey: newIdempotencyKey(),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ADMIN_STATUS_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-when">Čas události</Label>
                <Input
                  id="admin-when"
                  type="datetime-local"
                  required
                  value={adminForm.occurredAtLocal}
                  onChange={(e) =>
                    setAdminForm((f) => ({
                      ...f,
                      occurredAtLocal: e.target.value,
                      idempotencyKey: newIdempotencyKey(),
                    }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="admin-dose">Skutečná dávka</Label>
                <div className="flex gap-2">
                  <Input
                    id="admin-dose"
                    type="number"
                    step="any"
                    value={adminForm.doseValue}
                    onChange={(e) =>
                      setAdminForm((f) => ({
                        ...f,
                        doseValue: e.target.value,
                      }))
                    }
                  />
                  <Input
                    className="w-24"
                    value={adminForm.doseUnit}
                    onChange={(e) =>
                      setAdminForm((f) => ({
                        ...f,
                        doseUnit: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Cesta</Label>
                <Select
                  value={adminForm.routeSnapshot}
                  onValueChange={(v) =>
                    setAdminForm((f) => ({
                      ...f,
                      routeSnapshot: v ?? "oral",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROUTE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="admin-reason">Důvod / poznámka</Label>
                <Textarea
                  id="admin-reason"
                  value={adminForm.reason}
                  onChange={(e) =>
                    setAdminForm((f) => ({ ...f, reason: e.target.value }))
                  }
                />
              </div>
            </div>
            <p className="text-muted-foreground text-xs">
              Idempotency klíč: {adminForm.idempotencyKey.slice(0, 8)}…
            </p>
            <Button type="submit" disabled={pending || saveState === "saving"}>
              Potvrdit a uložit podání
            </Button>
          </form>

          {selectedOrder ? (
            <div className="flex flex-col gap-2">
              <h3 className="font-medium">
                Historie: {selectedOrder.medicationName}
              </h3>
              {orderAdmins.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  Žádná podání u této ordinace (ordinace sama o sobě není
                  důkazem užití).
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {orderAdmins.map((a) => (
                    <li
                      key={a.id}
                      className="border-border rounded-lg border px-3 py-2 text-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span>
                          {a.doseValue} {a.doseUnit} ·{" "}
                          {ADMIN_STATUS_LABELS[a.status] ?? a.status}
                        </span>
                        <time className="text-muted-foreground text-xs">
                          {formatInPatientTz(
                            a.occurredAt,
                            "d. M. yyyy HH:mm",
                            timeZone,
                          )}
                        </time>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        snapshot: {a.medicationNameSnapshot}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <h3 className="font-medium">Všechna podání</h3>
            {administrations.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Zatím žádná zaznamenaná podání.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {administrations.map((a) => (
                  <li
                    key={a.id}
                    className="border-border rounded-lg border px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium">
                        {a.medicationNameSnapshot}
                      </span>
                      <time className="text-muted-foreground text-xs">
                        {formatInPatientTz(
                          a.occurredAt,
                          "d. M. yyyy HH:mm",
                          timeZone,
                        )}
                      </time>
                    </div>
                    <p className="mt-0.5">
                      {a.doseValue} {a.doseUnit} ·{" "}
                      <Badge variant="secondary">
                        {ADMIN_STATUS_LABELS[a.status] ?? a.status}
                      </Badge>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
