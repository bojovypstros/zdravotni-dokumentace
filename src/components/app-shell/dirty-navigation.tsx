"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type DirtyFormHandlers = {
  /** Persist current draft. Return true when leave may continue. */
  save: () => Promise<boolean> | boolean;
  /** Drop draft locally (optional). */
  discard?: () => void;
};

type RegistryEntry = DirtyFormHandlers & {
  id: string;
  label?: string;
};

type DirtyNavigationContextValue = {
  register: (entry: RegistryEntry) => () => void;
  setDirty: (id: string, dirty: boolean) => void;
  isDirty: boolean;
  /** Navigate to href; if dirty, prompt save / discard / stay. */
  requestNavigate: (href: string) => void;
};

const DirtyNavigationContext =
  createContext<DirtyNavigationContextValue | null>(null);

export function DirtyNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const handlersRef = useRef(new Map<string, RegistryEntry>());
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(() => new Set());
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const register = useCallback((entry: RegistryEntry) => {
    handlersRef.current.set(entry.id, entry);
    return () => {
      handlersRef.current.delete(entry.id);
      setDirtyIds((prev) => {
        if (!prev.has(entry.id)) return prev;
        const next = new Set(prev);
        next.delete(entry.id);
        return next;
      });
    };
  }, []);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setDirtyIds((prev) => {
      const has = prev.has(id);
      if (dirty && has) return prev;
      if (!dirty && !has) return prev;
      const next = new Set(prev);
      if (dirty) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const isDirty = dirtyIds.size > 0;

  const requestNavigate = useCallback(
    (href: string) => {
      if (dirtyIds.size === 0) {
        router.push(href);
        return;
      }
      setPendingHref(href);
    },
    [dirtyIds, router],
  );

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const closeDialog = () => setPendingHref(null);

  const leaveWithDiscard = () => {
    if (!pendingHref) return;
    for (const id of dirtyIds) {
      handlersRef.current.get(id)?.discard?.();
    }
    const href = pendingHref;
    setPendingHref(null);
    setDirtyIds(new Set());
    router.push(href);
  };

  const leaveWithSave = async () => {
    if (!pendingHref) return;
    setBusy(true);
    try {
      for (const id of [...dirtyIds]) {
        const entry = handlersRef.current.get(id);
        if (!entry) continue;
        const ok = await entry.save();
        if (!ok) return;
        setDirtyIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      const href = pendingHref;
      setPendingHref(null);
      router.push(href);
    } finally {
      setBusy(false);
    }
  };

  const value = useMemo(
    () => ({ register, setDirty, isDirty, requestNavigate }),
    [register, setDirty, isDirty, requestNavigate],
  );

  return (
    <DirtyNavigationContext.Provider value={value}>
      {children}
      {pendingHref ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={closeDialog}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dirty-leave-title"
            className={cn(
              "bg-surface text-foreground w-full max-w-md rounded-xl border border-border p-5 shadow-lg",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="dirty-leave-title" className="text-base font-semibold">
              Neuložené změny
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Máte rozpracovaný formulář. Před odchodem do kartotéky uložte
              změny, nebo je zahoďte.
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                disabled={busy}
                onClick={closeDialog}
              >
                Zůstat
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                disabled={busy}
                onClick={leaveWithDiscard}
              >
                Zahodit
              </Button>
              <Button
                type="button"
                className="min-h-11"
                disabled={busy}
                onClick={() => void leaveWithSave()}
              >
                {busy ? "Ukládám…" : "Uložit a odejít"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </DirtyNavigationContext.Provider>
  );
}

export function useDirtyNavigation() {
  const ctx = useContext(DirtyNavigationContext);
  if (!ctx) {
    throw new Error("useDirtyNavigation must be used within DirtyNavigationProvider");
  }
  return ctx;
}

export function useOptionalDirtyNavigation() {
  return useContext(DirtyNavigationContext);
}

/**
 * Register a form as dirty while `dirty` is true.
 * `save` / `discard` are used when leaving the chart shell.
 */
export function useRegisterDirtyForm(options: {
  dirty: boolean;
  save: () => Promise<boolean> | boolean;
  discard?: () => void;
  label?: string;
}) {
  const ctx = useOptionalDirtyNavigation();
  const reactId = useId();
  const { dirty, save, discard, label } = options;
  const saveRef = useRef(save);
  const discardRef = useRef(discard);

  useEffect(() => {
    saveRef.current = save;
    discardRef.current = discard;
  }, [save, discard]);

  useEffect(() => {
    if (!ctx) return;
    return ctx.register({
      id: reactId,
      label,
      save: () => saveRef.current(),
      discard: () => discardRef.current?.(),
    });
  }, [ctx, reactId, label]);

  useEffect(() => {
    if (!ctx) return;
    ctx.setDirty(reactId, dirty);
  }, [ctx, reactId, dirty]);
}
