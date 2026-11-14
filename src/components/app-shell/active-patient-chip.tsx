"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  patientId: string;
  displayName: string;
  /** Tighter mobile chip — single-line name, no „Dekurz“ eyebrow. */
  compact?: boolean;
};

/** Larger active-patient signal in the chart topbar. Links to profile in chart. */
export function ActivePatientChip({
  patientId,
  displayName,
  compact = false,
}: Props) {
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
          "truncate font-semibold tracking-tight",
          compact ? "text-sm" : "text-sm md:text-base",
        )}
      >
        {displayName}
      </p>
    </Link>
  );
}
