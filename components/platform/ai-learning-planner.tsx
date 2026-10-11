"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "./primitives";
import { isOpportunityOpen, type Opportunity } from "@/lib/platform-store";
type Step = {
  skill: string;
  week: number;
  hours: number;
  task: string;
  resource_id: string | null;
};
type Plan = {
  starts_on: string;
  id: string;
  target_id: string;
  target_date: string;
  weekly_hours: number;
  model: string;
  prompt_version: string;
  draft: Step[];
  reviewed_steps: Step[] | null;
  accepted_at: string | null;
  goal_ids: string[];
};
export function AILearningPlanner({
  opportunities,
  onSaved,
}: {
  opportunities: Opportunity[];
  onSaved: () => unknown;
}) {
  const [plans, setPlans] = useState<Plan[]>([]),
    [plan, setPlan] = useState<Plan | null>(null),
    [steps, setSteps] = useState<Step[]>([]),
    [target, setTarget] = useState(""),
    [date, setDate] = useState(""),
    [hours, setHours] = useState(5),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [reviewed, setReviewed] = useState(false);
  async function load() {
    const { data, error } = await supabase
      .from("ai_learning_plans")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error)
      setMessage(
        "AI planner storage is unavailable. Apply migration 202609220012_ai_learning_plans.sql. Manual goals still work.",
      );
    else setPlans(data as Plan[]);
  }
  useEffect(() => {
    void load();
  }, []);
  function select(p: Plan) {
    setPlan(p);
    setSteps(p.reviewed_steps ?? p.draft);
    setReviewed(false);
  }
  return (
    <section className="glass-panel space-y-5 rounded-3xl p-6">
      <div>
        <h2 className="text-xl font-semibold">
          AI personalized learning planner
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Create a draft from assessed gaps or missing evidence, then review
          before adding goals. AI suggestions are not verified skills. Plans
          remain private; accepted goals follow your existing
          institution-sharing rules.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Target role / opportunity">
          <select
            className="field"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            <option value="">Choose a published target</option>
            {opportunities
              .filter(
                (o) =>
                  isOpportunityOpen(o) &&
                  ["student", "all"].includes(o.audience) &&
                  [
                    "Job",
                    "Internship",
                    "Apprenticeship",
                    "Live Project",
                  ].includes(o.type),
              )
              .map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Study hours per week (1–40)">
          <input
            className="field"
            type="number"
            min={1}
            max={40}
            value={hours}
            onChange={(e) => setHours(Number(e.target.value))}
          />
        </Field>
        <Field label="Target date (within 180 days)">
          <input
            className="field"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </div>
      <label className="flex gap-2 text-xs leading-5 text-muted-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        Send required skill names, assessment scores/thresholds, weekly time
        budget and relevant published program details to Google Gemini. No name,
        email, resume or documents are included. Save the generated draft
        privately in Supabase.
      </label>
      <Button
        disabled={busy || !consent || !target || !date}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const r = await fetch("/api/ai/learning-plan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                targetId: target,
                targetDate: date,
                weeklyHours: hours,
                consent,
              }),
            });
            const b = await r.json();
            if (!r.ok) throw new Error(b.error);
            select(b.plan);
            await load();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : "Generation failed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : "Generate learning draft"}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {!!plans.length && (
        <Field label="Resume a saved draft / plan (latest 20)">
          <select
            className="field"
            value={plan?.id ?? ""}
            onChange={(e) => {
              const p = plans.find((p) => p.id === e.target.value);
              if (p) select(p);
            }}
            disabled={busy}
          >
            <option value="">Choose a plan</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {opportunities.find((o) => o.id === p.target_id)?.title ??
                  "Saved target"}{" "}
                · {p.target_date} · {p.accepted_at ? "Goals saved" : "Draft"}
              </option>
            ))}
          </select>
        </Field>
      )}
      {plan && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {plan.model} · prompt {plan.prompt_version} · {plan.weekly_hours}{" "}
            hours/week · target {plan.target_date}. One goal per skill;
            estimates are not guarantees. Resources are rechecked on save.
          </p>
          {steps.map((s, index) => (
            <div key={s.skill} className="glass-row space-y-3 rounded-2xl p-4">
              <h3 className="font-semibold">
                Week {s.week} · {s.skill} · {s.hours} hours
              </h3>
              <Field label="Practice task and expected evidence">
                <textarea
                  className="field min-h-28"
                  minLength={20}
                  maxLength={2000}
                  value={s.task}
                  disabled={busy || !!plan.accepted_at}
                  onChange={(e) => {
                    setSteps(
                      steps.map((step, i) =>
                        i === index ? { ...step, task: e.target.value } : step,
                      ),
                    );
                    setReviewed(false);
                  }}
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Week (counted from draft creation)">
                  <input
                    type="number"
                    className="field"
                    min={1}
                    max={26}
                    disabled={busy || !!plan.accepted_at}
                    value={s.week}
                    onChange={(e) => {
                      setSteps(
                        steps.map((step, i) =>
                          i === index
                            ? { ...step, week: Number(e.target.value) }
                            : step,
                        ),
                      );
                      setReviewed(false);
                    }}
                  />
                </Field>
                <Field label="Estimated study hours">
                  <input
                    type="number"
                    className="field"
                    min={1}
                    max={plan.weekly_hours}
                    disabled={busy || !!plan.accepted_at}
                    value={s.hours}
                    onChange={(e) => {
                      setSteps(
                        steps.map((step, i) =>
                          i === index
                            ? { ...step, hours: Number(e.target.value) }
                            : step,
                        ),
                      );
                      setReviewed(false);
                    }}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                Schedule starts {plan.starts_on}; due at the end of this week,
                capped at {plan.target_date}. Late approval does not shift the
                schedule.
              </p>
              {s.resource_id ? (
                <>
                  <Link
                    className="text-sm role-text"
                    href={"/student/programs?program=" + s.resource_id}
                  >
                    {opportunities.find((o) => o.id === s.resource_id)?.title ??
                      "View linked program"}{" "}
                    ↗
                  </Link>
                  {!plan.accepted_at && (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        setSteps(
                          steps.map((step, i) =>
                            i === index ? { ...step, resource_id: null } : step,
                          ),
                        );
                        setReviewed(false);
                      }}
                    >
                      Use self-directed practice instead
                    </Button>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Self-directed practice—not a published course or credential.
                </p>
              )}
            </div>
          ))}
          {!plan.accepted_at ? (
            <>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I reviewed these tasks and understand completion does not verify
                proficiency.
              </label>
              <Button
                disabled={busy || !reviewed}
                onClick={async () => {
                  setBusy(true);
                  setMessage("");
                  try {
                    const { error } = await supabase.rpc(
                      "accept_ai_learning_plan",
                      { plan: plan.id, steps },
                    );
                    if (error) throw error;
                    await onSaved();
                    await load();
                    setPlan({
                      ...plan,
                      accepted_at: new Date().toISOString(),
                      reviewed_steps: steps,
                    });
                    setMessage(
                      "Goals saved. Use the existing goal cards below to track progress and attach evidence. Reassess separately.",
                    );
                  } catch (e) {
                    setMessage(
                      e instanceof Error
                        ? e.message
                        : (e as { message?: string })?.message ||
                            "Save failed. Existing goals are never overwritten; resolve duplicate skill/target goals before retrying.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Approve & save learning goals
              </Button>
            </>
          ) : (
            <p className="text-sm role-text">
              Plan accepted. Track these goals below; saved completion remains
              self-reported.{" "}
              <Link href="/student/industry-assessments">
                Explore reassessments ↗
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
