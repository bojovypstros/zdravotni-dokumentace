"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { apiFetch } from "@/lib/api/client";
import { DEFAULT_TIMEZONE } from "@/lib/datetime/prague";

export type QuickAddAction =
  | "menu"
  | "measurement"
  | "medication"
  | "symptom"
  | "note"
  | "lab"
  | "fluids";

export type QuickAddPatient = {
  id: string;
  displayName: string;
  preferredName: string | null;
  timezone: string;
};

type DefinitionLite = {
  id: string;
  key: string;
  label: string;
  category: string;
  valueType: string;
  canonicalUnit: string | null;
  allowedUnits: string[] | null;
  displayPrecision: number;
  supportsPair: boolean;
};

type ActiveOrderLite = {
  id: string;
  medicationName: string;
  doseValue: number;
  doseUnit: string;
  route: string;
  status: string;
};

type QuickAddContextValue = {
  open: boolean;
  action: QuickAddAction;
  /** Bumps on each open/action so form children remount with fresh state. */
  sessionKey: number;
  patient: QuickAddPatient | null;
  definitions: DefinitionLite[];
  vitalDefinitions: DefinitionLite[];
  labDefinitions: DefinitionLite[];
  activeOrders: ActiveOrderLite[];
  loading: boolean;
  openQuickAdd: (action?: QuickAddAction) => void;
  closeQuickAdd: () => void;
  setAction: (action: QuickAddAction) => void;
  refreshCatalog: () => Promise<void>;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable='true']"));
}

async function fetchCatalog(): Promise<{
  patient: QuickAddPatient | null;
  definitions: DefinitionLite[];
  activeOrders: ActiveOrderLite[];
}> {
  const patientsRes = await apiFetch("/api/patients");
  if (!patientsRes.ok) {
    return { patient: null, definitions: [], activeOrders: [] };
  }
  const patientsJson = (await patientsRes.json()) as {
    patients?: QuickAddPatient[];
  };
  const raw = patientsJson.patients?.[0] ?? null;
  if (!raw) {
    return { patient: null, definitions: [], activeOrders: [] };
  }
  const patient: QuickAddPatient = {
    id: raw.id,
    displayName: raw.displayName,
    preferredName: raw.preferredName ?? null,
    timezone: raw.timezone || DEFAULT_TIMEZONE,
  };

  const [defsRes, ordersRes] = await Promise.all([
    apiFetch(`/api/observation-definitions?patientId=${patient.id}`),
    apiFetch(`/api/medication-orders?patientId=${patient.id}&status=active`),
  ]);

  const definitions = defsRes.ok
    ? (((await defsRes.json()) as { definitions?: DefinitionLite[] })
        .definitions ?? [])
    : [];
  const activeOrders = ordersRes.ok
    ? (((await ordersRes.json()) as { orders?: ActiveOrderLite[] }).orders ??
      [])
    : [];

  return { patient, definitions, activeOrders };
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [action, setActionState] = useState<QuickAddAction>("menu");
  const [sessionKey, setSessionKey] = useState(0);
  const [patient, setPatient] = useState<QuickAddPatient | null>(null);
  const [definitions, setDefinitions] = useState<DefinitionLite[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrderLite[]>([]);
  const [loading, setLoading] = useState(true);

  const applyCatalog = useCallback(
    (catalog: Awaited<ReturnType<typeof fetchCatalog>>) => {
      setPatient(catalog.patient);
      setDefinitions(catalog.definitions);
      setActiveOrders(catalog.activeOrders);
      setLoading(false);
    },
    [],
  );

  const refreshCatalog = useCallback(async () => {
    setLoading(true);
    const catalog = await fetchCatalog();
    applyCatalog(catalog);
  }, [applyCatalog]);

  useEffect(() => {
    let cancelled = false;
    fetchCatalog().then((catalog) => {
      if (cancelled) return;
      applyCatalog(catalog);
    });
    return () => {
      cancelled = true;
    };
  }, [applyCatalog]);

  const openQuickAdd = useCallback((next: QuickAddAction = "menu") => {
    setActionState(next);
    setSessionKey((k) => k + 1);
    setOpen(true);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setOpen(false);
    setActionState("menu");
  }, []);

  const setAction = useCallback((next: QuickAddAction) => {
    setActionState(next);
    setSessionKey((k) => k + 1);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditableTarget(event.target)) return;
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        openQuickAdd("menu");
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeQuickAdd();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeQuickAdd, open, openQuickAdd]);

  const vitalDefinitions = useMemo(
    () =>
      definitions.filter(
        (d) =>
          d.category === "vital_sign" || d.category === "body_measurement",
      ),
    [definitions],
  );
  const labDefinitions = useMemo(
    () => definitions.filter((d) => d.category === "laboratory"),
    [definitions],
  );

  const value = useMemo<QuickAddContextValue>(
    () => ({
      open,
      action,
      sessionKey,
      patient,
      definitions,
      vitalDefinitions,
      labDefinitions,
      activeOrders,
      loading,
      openQuickAdd,
      closeQuickAdd,
      setAction,
      refreshCatalog,
    }),
    [
      open,
      action,
      sessionKey,
      patient,
      definitions,
      vitalDefinitions,
      labDefinitions,
      activeOrders,
      loading,
      openQuickAdd,
      closeQuickAdd,
      setAction,
      refreshCatalog,
    ],
  );

  return (
    <QuickAddContext.Provider value={value}>{children}</QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) {
    throw new Error("useQuickAdd must be used within QuickAddProvider");
  }
  return ctx;
}
