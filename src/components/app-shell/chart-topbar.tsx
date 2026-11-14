"use client";

import { ActivePatientChip } from "@/components/app-shell/active-patient-chip";
import { KartotekaLeaveButton } from "@/components/app-shell/kartoteka-leave-button";
import { LoggedInUser } from "@/components/app-shell/logged-in-user";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { QuickAddTriggerButton } from "@/components/quick-add/quick-add-host";

type Props = {
  title: string;
  patientId: string;
  patientDisplayName: string;
};

/**
 * Chart header: patient + Kartotéka leave | page title | account.
 * Thin primary edge marks „jsem v kartě“ without a different brand.
 */
export function ChartTopbar({
  title,
  patientId,
  patientDisplayName,
}: Props) {
  return (
    <header
      className="sticky z-30 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80"
      style={{ top: "env(safe-area-inset-top)" }}
    >
      <div className="h-0.5 w-full bg-primary/70" aria-hidden />
      <div className="flex min-h-14 items-center gap-3 px-4 md:gap-4 md:px-6">
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <ActivePatientChip
            patientId={patientId}
            displayName={patientDisplayName}
          />
          <KartotekaLeaveButton />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-center text-sm font-semibold tracking-tight md:text-base">
            {title}
          </h1>
        </div>

        <div className="flex min-h-14 shrink-0 items-center gap-2 border-l border-border pl-3 md:gap-3 md:pl-4">
          <LoggedInUser />
          <QuickAddTriggerButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
