"use client";

import { ActivePatientChip } from "@/components/app-shell/active-patient-chip";
import { LoggedInUser } from "@/components/app-shell/logged-in-user";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { QuickAddTriggerButton } from "@/components/quick-add/quick-add-host";

type TopbarProps = {
  title: string;
};

/**
 * Root layout owns the top safe-area spacer. Sticky offset keeps the bar clear
 * of the iOS notch when the spacer has scrolled away in standalone mode.
 *
 * Layout: page title | (flex) active patient (larger) | user account (top-right) + actions
 */
export function Topbar({ title }: TopbarProps) {
  return (
    <header
      className="sticky z-30 flex min-h-14 items-center gap-3 border-b border-border bg-surface/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/80 md:gap-4 md:px-6"
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

      <div className="flex min-h-14 min-w-0 items-center justify-end gap-3 md:gap-4">
        <ActivePatientChip />
        <div className="flex min-h-14 items-center gap-2 border-l border-border pl-3 md:pl-4">
          <LoggedInUser />
          <QuickAddTriggerButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
