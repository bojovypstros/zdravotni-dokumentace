"use client";

import { ActivePatientChip } from "@/components/app-shell/active-patient-chip";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { QuickAddTriggerButton } from "@/components/quick-add/quick-add-host";

type TopbarProps = {
  title: string;
};

/**
 * Root layout owns the top safe-area spacer. Sticky offset keeps the bar clear
 * of the iOS notch when the spacer has scrolled away in standalone mode.
 */
export function Topbar({ title }: TopbarProps) {
  return (
    <header
      className="sticky z-30 flex min-h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:px-6"
      style={{ top: "env(safe-area-inset-top)" }}
    >
      <div className="flex min-h-14 min-w-0 flex-1 items-center">
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground md:hidden">
            Zdravotní dokumentace
          </p>
          <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
            {title}
          </h1>
        </div>
      </div>
      <div className="flex min-h-14 items-center gap-2">
        <ActivePatientChip />
        <QuickAddTriggerButton />
        <ThemeToggle />
      </div>
    </header>
  );
}
