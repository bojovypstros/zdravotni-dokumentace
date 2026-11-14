"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Activity,
  Beaker,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react";

import { ObservationChart } from "@/components/observation/observation-chart";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiFetch } from "@/lib/api/client";
import { formatInPatientTz } from "@/lib/datetime/prague";
import type {
  DashboardPayload,
  DashboardTrendRange,
} from "@/server/services/dashboard";

const EVENT_TYPE_LABELS: Record<string, string> = {
  observation: "Měření",
  medication_administration: "Lék",
  clinical_note: "Poznámka",
  symptom: "Symptom",
  diary_scale: "Deník",
};

type Props = {
  initial: DashboardPayload;
};

export function DashboardPanel({ initial }: Props) {
  const { openQuickAdd } = useQuickAdd();
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const timeZone = data.patient.timezone;
  const displayName =
    data.patient.preferredName || data.patient.displayName;

  const latestWithValues = useMemo(
    () => data.latestValues.filter((v) => v.observation != null),
    [data.latestValues],
  );

  async function changeTrendRange(range: DashboardTrendRange) {
    setError(null);
    startTransition(async () => {
      const res = await apiFetch(
        `/api/dashboard?patientId=${data.patient.id}&trendRange=${range}`,
      );
      if (!res.ok) {
        setError("Nepodařilo se načíst trendy.");
        return;
      }
      const json = (await res.json()) as { dashboard: DashboardPayload };
      setData(json.dashboard);
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      {/* Patient header — no health score */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">
              Pacient
            </p>
            <h2 className="text-xl font-semibold tracking-tight">
              {displayName}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {data.patient.birthDate
                ? `Narozen/a ${formatInPatientTz(data.patient.birthDate, "d. M. yyyy", timeZone)}`
                : "Datum narození neuvedeno"}
              {data.patient.bloodGroup
                ? ` · krevní skupina ${data.patient.bloodGroup}`
                : ""}
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="min-h-11">
            <Link href={`/patients/${data.patient.id}`}>Profil</Link>
          </Button>
        </div>
      </section>

      {/* Allergy banner — separate from critical flags */}
      {data.allergyBanner.hasActive ? (
        <Alert variant="destructive">
          <AlertTitle>Alergie</AlertTitle>
          <AlertDescription>
            {data.allergyBanner.active
              .map((a) =>
                a.reaction
                  ? `${a.substance} (${a.reaction})`
                  : a.substance,
              )
              .join(" · ")}
          </AlertDescription>
        </Alert>
      ) : data.allergyBanner.noKnownAllergies ? (
        <Alert>
          <AlertTitle>Bez známých alergií</AlertTitle>
          <AlertDescription>
            Pacient má příznak „žádné známé alergie“. To není totéž jako
            neznámý stav.
          </AlertDescription>
        </Alert>
      ) : data.allergyBanner.statusUnknown ? (
        <Alert>
          <AlertTitle>Stav alergií neznámý</AlertTitle>
          <AlertDescription>
            Zatím nejsou evidované alergie ani příznak NKA.{" "}
            <Link href="/diagnoses" className="underline">
              Doplnit v Diagnózách a alergiích
            </Link>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Critical flags — separate caution strip (≠ allergies) */}
      {data.criticalFlagBanner?.hasActive ? (
        <Alert
          variant={
            data.criticalFlagBanner.active.some((f) => f.severity === "critical")
              ? "destructive"
              : "default"
          }
        >
          <AlertTitle>Kritická upozornění</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.criticalFlagBanner.active.map((f) => (
                <Badge
                  key={f.id}
                  variant={
                    f.severity === "critical" ? "destructive" : "secondary"
                  }
                  title={f.detail || f.note || f.label}
                >
                  {f.label}
                  {f.detail ? `: ${f.detail}` : ""}
                </Badge>
              ))}
              {data.criticalFlagBanner.overflow > 0 ? (
                <Badge variant="outline">
                  +{data.criticalFlagBanner.overflow}
                </Badge>
              ) : null}
            </div>
            <p className="mt-2 text-xs">
              <Link
                href={`/patients/${data.patient.id}`}
                className="underline underline-offset-2"
              >
                Upravit v profilu pacienta
              </Link>
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Quick actions — 1 interaction to form */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Rychlé akce</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 justify-start gap-2"
            onClick={() => openQuickAdd("measurement")}
          >
            <Activity className="size-4" aria-hidden />
            Měření
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 justify-start gap-2"
            onClick={() => openQuickAdd("medication")}
          >
            <Pill className="size-4" aria-hidden />
            Užití léku
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 justify-start gap-2"
            onClick={() => openQuickAdd("symptom")}
          >
            <Stethoscope className="size-4" aria-hidden />
            Symptom
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 justify-start gap-2"
            onClick={() => openQuickAdd("note")}
          >
            <FileText className="size-4" aria-hidden />
            Poznámka
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 justify-start gap-2"
            onClick={() => openQuickAdd("lab")}
          >
            <Beaker className="size-4" aria-hidden />
            Lab
            <Badge variant="outline" className="ml-auto">
              dostupné
            </Badge>
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">
          Primární akce ≤ 2 interakce. Globální „+“ / klávesa N otevře nabídku
          včetně Lab a Tekutin.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Latest values */}
        <Card>
          <CardHeader>
            <CardTitle>Poslední měření</CardTitle>
            <CardDescription>
              Nejnovější hodnota u každé veličiny — bez skóre zdraví.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {latestWithValues.length === 0 ? (
              <EmptyBlock
                text="Zatím žádná měření."
                actionLabel="Přidat měření"
                onAction={() => openQuickAdd("measurement")}
              />
            ) : (
              <ul className="divide-y divide-border">
                {latestWithValues.map((row) => (
                  <li
                    key={row.definitionId}
                    className="flex items-baseline justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {row.definitionLabel}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {row.occurredAt
                          ? formatInPatientTz(
                              row.occurredAt,
                              "d. M. yyyy HH:mm",
                              timeZone,
                            )
                          : "—"}
                        {row.category === "laboratory" ? " · lab" : ""}
                      </p>
                    </div>
                    <p className="shrink-0 tabular-nums">{row.formatted}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3">
              <Button asChild variant="outline" size="sm" className="min-h-11">
                <Link href="/observations">Všechna měření</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Med summary */}
        <Card>
          <CardHeader>
            <CardTitle>Medikace</CardTitle>
            <CardDescription>
              Aktivní plán a nedávná užití.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.activeMedications.length === 0 ? (
              <EmptyBlock
                text="Žádná aktivní medikace."
                actionLabel="Otevřít medikaci"
                href="/medications"
              />
            ) : (
              <ul className="space-y-2">
                {data.activeMedications.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.medicationName}</p>
                      <p className="text-muted-foreground text-xs">
                        {m.doseValue} {m.doseUnit}
                        {m.frequencyText ? ` · ${m.frequencyText}` : ""}
                      </p>
                    </div>
                    <Badge variant="secondary">aktivní</Badge>
                  </li>
                ))}
              </ul>
            )}

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Poslední užití
              </p>
              {data.recentAdministrations.length === 0 ? (
                <EmptyBlock
                  text="Zatím žádné záznamy užití."
                  actionLabel="Zaznamenat užití"
                  onAction={() => openQuickAdd("medication")}
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.recentAdministrations.slice(0, 5).map((a) => (
                    <li key={a.id} className="py-2 text-sm">
                      <span className="font-medium">
                        {a.medicationNameSnapshot}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {a.doseValue} {a.doseUnit} · {a.status}
                      </span>
                      <div className="text-muted-foreground text-xs">
                        {formatInPatientTz(
                          a.occurredAt,
                          "d. M. yyyy HH:mm",
                          timeZone,
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/medications">Medikace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Trendy</CardTitle>
            <CardDescription>
              Naměřené body bez interpolace. Bez diagnostického skóre.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1">
            {(["7d", "30d", "90d"] as DashboardTrendRange[]).map((r) => (
              <Button
                key={r}
                type="button"
                size="sm"
                variant={data.trendRange === r ? "default" : "outline"}
                className="min-h-11"
                disabled={pending}
                onClick={() => void changeTrendRange(r)}
              >
                {r === "7d" ? "7 dní" : r === "30d" ? "30 dní" : "90 dní"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : null}
          {data.trends.every((t) => t.points.length === 0) ? (
            <EmptyBlock
              text="Pro zvolené období nejsou žádné body grafu."
              actionLabel="Přidat měření"
              onAction={() => openQuickAdd("measurement")}
            />
          ) : (
            data.trends.map((series) => (
              <div key={series.definitionId} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-medium">{series.definitionLabel}</h4>
                  <span className="text-muted-foreground text-xs">
                    {series.points.length} bodů · {series.unit}
                  </span>
                </div>
                <ObservationChart
                  points={series.points}
                  unit={series.unit}
                  supportsPair={series.supportsPair}
                  timeZone={timeZone}
                  precision={series.displayPrecision}
                />
                {series.points.length > 0 ? (
                  <details className="text-sm">
                    <summary className="text-muted-foreground cursor-pointer">
                      Tabulka hodnot
                    </summary>
                    <table className="mt-2 w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="py-1 pr-2 font-medium">Čas</th>
                          <th className="py-1 font-medium">Hodnota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...series.points]
                          .reverse()
                          .slice(0, 20)
                          .map((p) => (
                            <tr
                              key={p.occurredAt + p.label}
                              className="border-b border-border/60"
                            >
                              <td className="py-1 pr-2">
                                {formatInPatientTz(
                                  p.occurredAt,
                                  "d. M. HH:mm",
                                  timeZone,
                                )}
                              </td>
                              <td className="py-1 tabular-nums">{p.label}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </details>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent events */}
      <Card>
        <CardHeader>
          <CardTitle>Nedávné události</CardTitle>
          <CardDescription>Z unified timeline (nejnovější první).</CardDescription>
        </CardHeader>
        <CardContent>
          {data.recentEvents.length === 0 ? (
            <EmptyBlock
              text="Zatím žádné události na časové ose."
              actionLabel="Přidat záznam"
              onAction={() => openQuickAdd("menu")}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentEvents.map((ev) => (
                <li key={ev.id} className="flex gap-3 py-2.5">
                  <Badge variant="outline" className="mt-0.5 shrink-0">
                    {EVENT_TYPE_LABELS[ev.type] ?? ev.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{ev.title}</p>
                    <p className="text-muted-foreground truncate text-sm">
                      {ev.summary}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatInPatientTz(
                        ev.occurredAt,
                        "d. M. yyyy HH:mm",
                        timeZone,
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Button asChild variant="outline" size="sm" className="min-h-11">
              <Link href="/timeline">Celá časová osa</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyBlock({
  text,
  actionLabel,
  onAction,
  href,
}: {
  text: string;
  actionLabel: string;
  onAction?: () => void;
  href?: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-sm">
      <p className="text-muted-foreground">{text}</p>
      <div className="mt-2">
        {href ? (
          <Button asChild size="sm" className="min-h-11">
            <Link href={href}>{actionLabel}</Link>
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            onClick={onAction}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
