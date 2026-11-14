"use client";

import Link from "next/link";
import { Settings } from "lucide-react";

import { ActivePatientChip } from "@/components/app-shell/active-patient-chip";
import { ChartSectionAccent } from "@/components/app-shell/chart-section-accent";
import { KartotekaLeaveButton } from "@/components/app-shell/kartoteka-leave-button";
import { LoggedInUser } from "@/components/app-shell/logged-in-user";
import { ThemeToggle } from "@/components/app-shell/theme-toggle";
import { QuickAddTriggerButton } from "@/components/quick-add/quick-add-host";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  patientId: string;
  patientDisplayName: string;
};

/**
 * Chart header: patient + Kartotéka leave | page title | account.
 * Mobile: two compact rows (no horizontal scroll); desktop: single row.
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
      <ChartSectionAccent />

      {/* Mobile: stack — patient row, then section title */}
      <div className="flex flex-col gap-1 px-3 py-2 md:hidden">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <ActivePatientChip
              patientId={patientId}
              displayName={patientDisplayName}
              compact
            />
          </div>
          <KartotekaLeaveButton />
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
          >
            <Link
              href="/settings"
              aria-label="Účet / nastavení"
              title="Účet / nastavení"
            >
              <Settings className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <h1 className="truncate text-center text-sm font-semibold tracking-tight">
          {title}
        </h1>
      </div>

      {/* Desktop: single row */}
      <div className="hidden min-h-14 items-center gap-4 px-6 md:flex">
        <div className="flex min-w-0 items-center gap-3">
          <ActivePatientChip
            patientId={patientId}
            displayName={patientDisplayName}
          />
          <KartotekaLeaveButton />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-center text-base font-semibold tracking-tight">
            {title}
          </h1>
        </div>

        <div className="flex min-h-14 shrink-0 items-center gap-3 border-l border-border pl-4">
          <LoggedInUser />
          <QuickAddTriggerButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
