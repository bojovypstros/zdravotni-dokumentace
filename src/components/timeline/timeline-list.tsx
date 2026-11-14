"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { timelineSectionTone } from "@/lib/chart-section-colors";
import {
  ALL_TIMELINE_EVENT_TYPES,
  type TimelineDayGroup,
  type TimelineEvent,
  type TimelineEventType,
} from "@/lib/timeline/types";
import { formatInPatientTz } from "@/lib/datetime/prague";
import { TIMELINE_EVENT_TYPE_LABELS as TYPE_LABELS } from "@/lib/labels/cs";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;

type Props = {
  patientId: string;
  timeZone: string;
  initialEvents: TimelineEvent[];
  initialGroups: TimelineDayGroup[] | null;
  initialTotal: number;
  initialNextOffset: number | null;
};

function formatDayHeading(dateKey: string, timeZone: string): string {
  // dateKey is YYYY-MM-DD — interpret noon UTC to avoid edge TZ flips for label.
  const iso = `${dateKey}T12:00:00.000Z`;
  return formatInPatientTz(iso, "EEEE d. M. yyyy", timeZone);
}

export function TimelineList({
  patientId,
  timeZone,
  initialEvents,
  initialGroups,
  initialTotal,
  initialNextOffset,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [events, setEvents] = useState(initialEvents);
  const [groups, setGroups] = useState(initialGroups);
  const [total, setTotal] = useState(initialTotal);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [enabledTypes, setEnabledTypes] = useState<Set<TimelineEventType>>(
    () => new Set(ALL_TIMELINE_EVENT_TYPES),
  );
  const [fromLocal, setFromLocal] = useState("");
  const [toLocal, setToLocal] = useState("");

  const typeQuery = useMemo(
    () => [...enabledTypes].join(","),
    [enabledTypes],
  );

  function toggleType(type: TimelineEventType) {
    setEnabledTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) return prev;
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }

  async function loadPage(nextOff: number) {
    setError(null);
    const params = new URLSearchParams({
      patientId,
      limit: String(PAGE_SIZE),
      offset: String(nextOff),
      groupByDay: "true",
      timeZone,
    });
    if (typeQuery) params.set("types", typeQuery);
    if (fromLocal) params.set("from", new Date(fromLocal).toISOString());
    if (toLocal) params.set("to", new Date(toLocal).toISOString());

    const res = await fetch(`/api/timeline?${params.toString()}`, {
      credentials: "same-origin",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(body?.error ?? "Načtení časové osy selhalo.");
    }
    const data = (await res.json()) as {
      events: TimelineEvent[];
      groups: TimelineDayGroup[] | null;
      total: number;
      nextOffset: number | null;
    };
    setEvents(data.events);
    setGroups(data.groups);
    setTotal(data.total);
    setNextOffset(data.nextOffset);
    setOffset(nextOff);
  }

  function applyFilters() {
    startTransition(() => {
      void loadPage(0).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Chyba.");
      });
    });
  }

  function loadMore() {
    if (nextOffset == null) return;
    startTransition(() => {
      void loadPage(nextOffset).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Chyba.");
      });
    });
  }

  function loadPrev() {
    const prev = Math.max(0, offset - PAGE_SIZE);
    startTransition(() => {
      void loadPage(prev).catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Chyba.");
      });
    });
  }

  const displayGroups =
    groups ??
    (events.length > 0
      ? [{ dateKey: "all", events }]
      : []);

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border rounded-xl border p-4">
        <p className="mb-3 text-sm font-medium">Filtry</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {ALL_TIMELINE_EVENT_TYPES.map((type) => {
            const on = enabledTypes.has(type);
            const tone = timelineSectionTone(type);
            return (
              <button
                key={type}
                type="button"
                className={cn(
                  "inline-flex min-h-8 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                  on ? tone.chipOn : cn(tone.chip, "opacity-55"),
                )}
                onClick={() => toggleType(type)}
                aria-pressed={on}
              >
                {TYPE_LABELS[type]}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="tl-from">Od</Label>
            <input
              id="tl-from"
              type="datetime-local"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={fromLocal}
              onChange={(e) => setFromLocal(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="tl-to">Do</Label>
            <input
              id="tl-to"
              type="datetime-local"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              value={toLocal}
              onChange={(e) => setToLocal(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" onClick={applyFilters} disabled={pending}>
            Použít filtry
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setFromLocal("");
              setToLocal("");
              setEnabledTypes(new Set(ALL_TIMELINE_EVENT_TYPES));
              startTransition(() => {
                router.refresh();
                void loadPage(0).catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Chyba.");
                });
              });
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Zobrazeno {events.length} z {total} · offset {offset} · seskupeno po
        dnech ({timeZone})
      </p>

      {events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Žádné události pro zvolené filtry. Přidejte měření, podání léku,
          symptom, deník škál nebo poznámku.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {displayGroups.map((group) => (
            <section key={group.dateKey}>
              {group.dateKey !== "all" ? (
                <h2 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                  {formatDayHeading(group.dateKey, timeZone)}
                </h2>
              ) : null}
              <ol className="flex flex-col gap-3">
                {group.events.map((ev) => {
                  const tone = timelineSectionTone(ev.type);
                  return (
                    <li
                      key={ev.id}
                      className={cn("rounded-xl px-4 py-3", tone.card)}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-medium">{ev.title}</div>
                        <time
                          className="text-muted-foreground text-xs whitespace-nowrap"
                          dateTime={ev.occurredAt}
                        >
                          {formatInPatientTz(
                            ev.occurredAt,
                            "HH:mm",
                            timeZone,
                          )}
                        </time>
                      </div>
                      <p className="mt-1 text-sm">{ev.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            tone.chip,
                          )}
                        >
                          {TYPE_LABELS[ev.type] ?? ev.type}
                        </span>
                        {ev.occurredAt !== ev.recordedAt ? (
                          <span className="text-muted-foreground text-xs">
                            zaznamenáno{" "}
                            {formatInPatientTz(
                              ev.recordedAt,
                              "d. M. HH:mm",
                              timeZone,
                            )}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending || offset === 0}
          onClick={loadPrev}
        >
          Předchozí
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || nextOffset == null}
          onClick={loadMore}
        >
          Další
        </Button>
      </div>
    </div>
  );
}
