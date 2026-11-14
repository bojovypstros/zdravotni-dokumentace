"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ActiveSummary = {
  id: string;
  displayName: string;
  preferredName: string | null;
};

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
      <span className="text-muted-foreground hidden max-w-[10rem] truncate text-xs sm:inline">
        …
      </span>
    );
  }

  const label = patient
    ? patient.preferredName || patient.displayName
    : "Bez pacienta";

  return (
    <Link
      href="/patients"
      className="text-muted-foreground hover:text-foreground hidden max-w-[12rem] truncate text-xs underline-offset-2 hover:underline sm:inline"
      title="Kartotéka — přepnout aktivního pacienta"
    >
      {label}
    </Link>
  );
}
