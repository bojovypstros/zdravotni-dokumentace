"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ActiveSummary = {
  id: string;
  displayName: string;
  preferredName: string | null;
};

/** Larger active-patient signal in the topbar (left of account cluster). */
export function ActivePatientChip() {
  const [patient, setPatient] = useState<ActiveSummary | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/patients/active", {
          credentials: "same-origin",
        });
        if (!res.ok) {
          if (!cancelled) setPatient(null);
          return;
        }
        const data = (await res.json()) as {
          patient?: ActiveSummary | null;
        };
        if (!cancelled) {
          setPatient(
            data.patient
              ? {
                  id: data.patient.id,
                  displayName: data.patient.displayName,
                  preferredName: data.patient.preferredName ?? null,
                }
              : null,
          );
        }
      } catch {
        if (!cancelled) setPatient(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (patient === undefined) {
    return (
      <div className="min-w-0 max-w-[14rem] md:max-w-[18rem]">
        <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
          Pacient
        </p>
        <p className="text-muted-foreground truncate text-sm font-medium">…</p>
      </div>
    );
  }

  const label = patient
    ? patient.preferredName || patient.displayName
    : "Bez pacienta";
  const href = patient ? `/patients/${patient.id}` : "/patients";

  return (
    <Link
      href={href}
      className="hover:text-foreground min-w-0 max-w-[14rem] no-underline md:max-w-[18rem]"
      title="Kartotéka — aktivní pacient"
    >
      <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
        Pacient
      </p>
      <p className="truncate text-sm font-semibold tracking-tight md:text-base">
        {label}
      </p>
    </Link>
  );
}
