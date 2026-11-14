"use client";

import Link from "next/link";

type Props = {
  patientId: string;
  displayName: string;
};

/** Larger active-patient signal in the chart topbar. Links to profile in chart. */
export function ActivePatientChip({ patientId, displayName }: Props) {
  return (
    <Link
      href={`/patients/${patientId}`}
      className="hover:text-foreground min-w-0 max-w-[16rem] no-underline md:max-w-[22rem]"
      title="Profil pacienta"
    >
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        Dekurz
      </p>
      <p className="truncate text-sm font-semibold tracking-tight md:text-base">
        {displayName}
      </p>
    </Link>
  );
}
