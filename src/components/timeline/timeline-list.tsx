"use client";

import { Badge } from "@/components/ui/badge";
import { formatInPatientTz } from "@/lib/datetime/prague";
import type { TimelineEvent } from "@/lib/timeline/types";

type Props = {
  events: TimelineEvent[];
  timeZone: string;
};

export function TimelineList({ events, timeZone }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Zatím žádné události. Přidejte měření ve Vitálních funkcích — objeví se
        zde (Phase 3 hook; další typy ve Fázi 5).
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {events.map((ev) => (
        <li
          key={ev.id}
          className="border-border rounded-xl border px-4 py-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="font-medium">{ev.title}</div>
            <time
              className="text-muted-foreground text-xs whitespace-nowrap"
              dateTime={ev.occurredAt}
            >
              {formatInPatientTz(ev.occurredAt, "d. M. yyyy HH:mm", timeZone)}
            </time>
          </div>
          <p className="mt-1 text-sm">{ev.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{ev.type}</Badge>
            {ev.occurredAt !== ev.recordedAt ? (
              <span className="text-muted-foreground text-xs">
                zaznamenáno{" "}
                {formatInPatientTz(ev.recordedAt, "d. M. HH:mm", timeZone)}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
