"use client";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { usePlatformData, type Role } from "@/lib/platform-store";
import { useLearningPrograms } from "@/lib/learning-programs";
import { useRecruitment } from "@/lib/recruitment";
import { buildOutcomeTrends } from "@/lib/outcome-trends.mjs";
import { OutcomeActivityChart } from "./outcome-activity-chart";
import { PageHeading, Field, DataState, Metric, Empty } from "./primitives";
export function OutcomeTrends({ role }: { role: Role }) {
  const platform = usePlatformData(),
    learning = useLearningPrograms(),
    recruitment = useRecruitment();
  const [from, setFrom] = useState(() =>
      new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [department, setDepartment] = useState(""),
    [year, setYear] = useState("");
  let model: any = null,
    error = "";
  if (
    platform.data &&
    learning.data &&
    recruitment.data &&
    !platform.error &&
    !learning.error &&
    !recruitment.error
  )
    try {
      model = buildOutcomeTrends({
        platform: platform.data,
        learning: learning.data,
        recruitment: recruitment.data,
        from,
        to,
        department,
        year,
      });
    } catch (e) {
      error = e instanceof Error ? e.message : "Invalid date range";
    }
  return (
    <DashboardShell role={role} title="Outcome explorer">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Evidence, over time"
          title="See activity behind the outcomes."
          description="Explore dated applications, reviewed learning completions and confirmed joining for your current authorized cohort. Compare monthly activity and inspect actual platform skill requirements."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...learning} retry={learning.refresh} />
        <DataState {...recruitment} retry={recruitment.refresh} />
        <div className="glass-panel rounded-3xl p-5 grid gap-4 md:grid-cols-4">
          <Field label="From (UTC)">
            <input
              className="field"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="Through (UTC)">
            <input
              className="field"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <Field label="Department (exact match, optional)">
            <input
              className="field"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </Field>
          <Field label="Graduation year (optional)">
            <input
              className="field"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </Field>
        </div>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {model && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Metric
                label="Current cohort accounts"
                value={model.cohortSize}
              />
              <Metric
                label="Visible hiring opportunities published in range"
                value={model.opportunities}
              />
            </div>
            <OutcomeActivityChart
              months={model.months}
              from={model.from}
              to={model.to}
            />
            <section className="glass-panel rounded-3xl p-6 overflow-auto">
              <h2 className="text-xl font-semibold mb-4">Monthly outcomes</h2>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Monthly activity for the current authorized cohort
                </caption>
                <thead>
                  <tr>
                    {[
                      "UTC month",
                      "Applications",
                      "Learning completions",
                      "Joining confirmations",
                    ].map((h) => (
                      <th key={h} className="p-3" scope="col">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {model.months.map((m: any) => (
                    <tr key={m.month} className="border-t border-border">
                      <th scope="row" className="p-3">
                        {m.month}
                      </th>
                      <td className="p-3">{m.applications}</td>
                      <td className="p-3">{m.learningCompletions}</td>
                      <td className="p-3">{m.confirmedJoinings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="glass-panel rounded-3xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">
                Skills requested in published hiring opportunities
              </h2>
              <p className="text-xs text-muted-foreground">
                This section covers all opportunities visible to your account,
                not only your cohort or organization. Each opportunity counts
                once per canonical skill.
              </p>
              {!model.demand.length && (
                <Empty
                  title="No hiring demand in this range"
                  description="Broaden the dates or publish real hiring opportunities."
                />
              )}
              {model.demand.map((d: any) => (
                <details key={d.skill} className="glass-row rounded-xl p-3">
                  <summary className="cursor-pointer text-sm">
                    {d.skill} · {d.opportunities} opportunities
                  </summary>
                  <ul className="mt-3 space-y-2 text-xs">
                    {d.sourceIds.map((id: string) => (
                      <li key={id}>
                        {
                          platform.data?.opportunities.find((o) => o.id === id)
                            ?.title
                        }{" "}
                        · {id}
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </section>
            <section className="glass-panel rounded-3xl p-6 space-y-3">
              <h2 className="font-semibold">Scope and definitions</h2>
              <p className="text-sm">{model.scope}</p>
              {model.definitions.map((text: string) => (
                <p key={text} className="text-xs text-muted-foreground">
                  {text}
                </p>
              ))}
              <Button
                variant="outline"
                onClick={() => {
                  const report = {
                    from: model.from,
                    to: model.to,
                    scope: model.scope,
                    definitions: model.definitions,
                    privacy:
                      "Aggregated authorized report. Not guaranteed anonymous; review before external sharing.",
                    months: model.months.map((m: any) => ({
                      month: m.month,
                      ...Object.fromEntries(
                        [
                          "applications",
                          "learningCompletions",
                          "confirmedJoinings",
                        ].map((k) => [k, m[k] < 5 ? "<5" : m[k]]),
                      ),
                    })),
                    demand: model.demand
                      .filter((d: any) => d.opportunities >= 5)
                      .map(({ skill, opportunities }: any) => ({
                        skill,
                        opportunities,
                      })),
                  };
                  const url = URL.createObjectURL(
                    new Blob([JSON.stringify(report, null, 2)], {
                      type: "application/json",
                    }),
                  );
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "origin-point-aggregate-outcomes.json";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                }}
              >
                Export aggregate report (counts under 5 withheld)
              </Button>
            </section>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
