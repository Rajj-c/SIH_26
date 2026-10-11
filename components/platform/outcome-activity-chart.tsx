"use client";

import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  outcomeSeries,
  summarizeOutcomeMonths,
} from "@/lib/outcome-summary.mjs";
import { Empty, Metric } from "./primitives";

type Month = {
  month: string;
  applications: number;
  learningCompletions: number;
  confirmedJoinings: number;
};

export function OutcomeActivityChart({
  months,
  from,
  to,
}: {
  months: Month[];
  from: string;
  to: string;
}) {
  const descriptionId = useId();
  const [visible, setVisible] = useState<string[]>(
    outcomeSeries.map((s) => s.key),
  );
  const summary = summarizeOutcomeMonths(months);
  return (
    <section className="space-y-4" aria-label="Activity in the selected period">
      <div className="grid gap-4 sm:grid-cols-3">
        {outcomeSeries.map(({ key, label }) => (
          <Metric
            key={key}
            label={`${label} in range`}
            value={summary.totals[key]}
          />
        ))}
      </div>
      <div className="glass-panel rounded-3xl p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Activity over time</h2>
          <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
            {from} through {to}, UTC. Boundary months include only the selected
            dates. These are separate event counts, not a conversion funnel.
            Exact values are also available in the monthly table below.
          </p>
        </div>
        <fieldset className="flex flex-wrap gap-x-6 gap-y-3">
          <legend className="sr-only">Choose chart series</legend>
          {outcomeSeries.map(({ key, label, color }) => (
            <label
              key={key}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={visible.includes(key)}
                onChange={(event) =>
                  setVisible((current) =>
                    event.target.checked
                      ? [...current, key]
                      : current.filter((item) => item !== key),
                  )
                }
              />
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
            </label>
          ))}
        </fieldset>
        {!summary.hasActivity ? (
          <Empty
            title="No recorded activity in this period"
            description="Choose a wider date range or return after authorized records have been saved. No sample activity is added."
          />
        ) : !visible.length ? (
          <p
            role="status"
            className="py-12 text-center text-sm text-muted-foreground"
          >
            Select at least one series to display the chart.
          </p>
        ) : (
          <div className="overflow-x-auto" aria-describedby={descriptionId}>
            <div
              className="h-72"
              style={{ minWidth: Math.max(340, months.length * 72) }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={months}
                  margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
                  accessibilityLayer
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: "currentColor" }}
                    interval={0}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "currentColor" }}
                    width={48}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--background))",
                      color: "hsl(var(--foreground))",
                      borderRadius: 12,
                    }}
                  />
                  {outcomeSeries
                    .filter(({ key }) => visible.includes(key))
                    .map(({ key, label, color }) => (
                      <Bar
                        key={key}
                        dataKey={key}
                        name={label}
                        fill={color}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={24}
                        isAnimationActive={false}
                      />
                    ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
