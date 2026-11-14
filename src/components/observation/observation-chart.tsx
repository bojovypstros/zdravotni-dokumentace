"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatInPatientTz } from "@/lib/datetime/prague";

export type ChartPoint = {
  occurredAt: string;
  /** Primary numeric (or systolic). Undefined = gap — never interpolate. */
  value?: number;
  /** Diastolic for BP pairs. */
  secondary?: number;
  label: string;
};

type Props = {
  points: ChartPoint[];
  unit: string;
  supportsPair: boolean;
  timeZone: string;
  precision: number;
};

export function ObservationChart({
  points,
  unit,
  supportsPair,
  timeZone,
  precision,
}: Props) {
  if (points.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Žádná naměřená data v zvoleném období. Graf neinterpoluje chybějící
        hodnoty.
      </p>
    );
  }

  const data = [...points]
    .sort(
      (a, b) =>
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
    )
    .map((p) => ({
      ...p,
      tick: formatInPatientTz(p.occurredAt, "d.M. HH:mm", timeZone),
    }));

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="h-64 w-full min-w-0" role="img" aria-label={`Graf ${unit}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="tick"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              domain={["auto", "auto"]}
              tickFormatter={(v: number) =>
                typeof v === "number" ? v.toFixed(precision) : String(v)
              }
              width={48}
            />
            <Tooltip
              formatter={(value, name) => {
                if (value == null || typeof value !== "number")
                  return ["—", name];
                return [`${value.toFixed(precision)} ${unit}`, String(name)];
              }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as ChartPoint | undefined;
                if (!row) return "";
                return formatInPatientTz(
                  row.occurredAt,
                  "d. M. yyyy HH:mm",
                  timeZone,
                );
              }}
            />
            <Legend />
            <Line
              type="linear"
              dataKey="value"
              name={supportsPair ? "Systolický" : "Hodnota"}
              stroke="var(--color-chart-1, hsl(var(--chart-1)))"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {supportsPair ? (
              <Line
                type="linear"
                dataKey="secondary"
                name="Diastolický"
                stroke="var(--color-chart-2, hsl(var(--chart-2)))"
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-muted-foreground text-xs">
        Jednotka: {unit}. Chybějící body nejsou dopočítávány (bez interpolace).
      </p>
    </div>
  );
}
