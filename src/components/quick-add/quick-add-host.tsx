"use client";

import { Plus } from "lucide-react";

import {
  QuickAddProvider,
  useQuickAdd,
} from "@/components/quick-add/quick-add-context";
import { QuickAddSheet } from "@/components/quick-add/quick-add-sheet";
import { Button } from "@/components/ui/button";

export function QuickAddFab() {
  const { openQuickAdd, patient } = useQuickAdd();
  return (
    <Button
      type="button"
      size="icon-lg"
      className="fixed z-40 size-14 rounded-full shadow-lg bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6"
      onClick={() => openQuickAdd("menu")}
      aria-label="Rychlé přidání"
      title="Rychlé přidání (N)"
      disabled={!patient}
    >
      <Plus className="size-6" aria-hidden />
    </Button>
  );
}

export function QuickAddTriggerButton({
  className,
}: {
  className?: string;
}) {
  const { openQuickAdd, patient } = useQuickAdd();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className ?? "min-h-11 gap-1.5"}
      onClick={() => openQuickAdd("menu")}
      disabled={!patient}
      aria-label="Rychlé přidání"
      title="Rychlé přidání (N)"
    >
      <Plus className="size-4" aria-hidden />
      <span className="hidden sm:inline">Přidat</span>
    </Button>
  );
}

function QuickAddChrome() {
  return (
    <>
      <QuickAddFab />
      <QuickAddSheet />
    </>
  );
}

/** Provider + FAB + sheet for the app shell. */
export function QuickAddHost({ children }: { children: React.ReactNode }) {
  return (
    <QuickAddProvider>
      {children}
      <QuickAddChrome />
    </QuickAddProvider>
  );
}
