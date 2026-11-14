"use client";

import Link from "next/link";

import { PatientArchiveBadge } from "@/components/patient/patient-archive-badge";
import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  displayName: string;
  archivedAt?: string | null;
  /** Tighter mobile chip — single-line name, no „Dekurz“ eyebrow. */
  compact?: boolean;
};

/** Larger active-patient signal in the chart topbar. Links to profile in chart. */
export function ActivePatientChip({
  patientId,
  displayName,
  archivedAt = null,
  compact = false,
}: Props) {
  const archived = Boolean(archivedAt);
  return (
    <Link
      href={`/patients/${patientId}`}
      className={cn(
        "hover:text-foreground min-w-0 no-underline",
        compact ? "block max-w-full" : "max-w-[16rem] md:max-w-[22rem]",
      )}
      title="Profil pacienta"
    >
      {compact ? null : (
        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
          Dekurz
        </p>
      )}
      <p
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          compact ? "text-sm" : "text-sm md:text-base",
        )}
      >
        <span className="truncate font-semibold tracking-tight">
          {displayName}
        </span>
        {archived ? <PatientArchiveBadge className="shrink-0" /> : null}
      </p>
    </Link>
  );
}
