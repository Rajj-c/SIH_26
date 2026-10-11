"use client";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { usePlatformData, type Role } from "@/lib/platform-store";
import {
  useInitiatives,
  initiativeAction,
  type Initiative,
  type InitiativeEntry,
} from "@/lib/initiatives";
import {
  PageHeading,
  DataState,
  Empty,
  Field,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
export function Initiatives({ role }: { role: Role }) {
  const state = useInitiatives(),
    platform = usePlatformData(),
    action = useAction();
  const [view, setView] = useState("Discover");
  const me = platform.data?.profile.id;
  const initiatives =
    state.data?.initiatives.filter((i) =>
      view === "Hosted"
        ? i.owner_id === me
        : view === "Participating"
          ? state.data!.entries.some(
              (e) => e.initiative_id === i.id && e.learner_id === me,
            )
          : true,
    ) ?? [];
  return (
    <DashboardShell role={role} title="Challenges & mentorship">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Build with purpose"
          title="Real challenges. Ongoing guidance."
          description="Submit work against published judging criteria or request mentorship around specific goals. Progress and decisions are saved; participation never automatically awards a verified skill."
        />
        <DataState {...state} retry={state.refresh} />
        <DataState {...platform} retry={platform.refresh} />
        {action.feedback}
        {role !== "student" && (
          <details className="glass-panel rounded-3xl p-6">
            <summary className="cursor-pointer font-semibold">
              Publish a challenge or mentorship call
            </summary>
            <form
              className="mt-4 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void action.run(
                  () =>
                    initiativeAction("publish_initiative", {
                      payload: {
                        ...Object.fromEntries(f),
                        deadline: new Date(
                          String(f.get("deadline")),
                        ).toISOString(),
                        capacity: Number(f.get("capacity")),
                      },
                    }),
                  "Initiative published.",
                );
              }}
            >
              <Field label="Format">
                <select name="kind" className="field">
                  <option>Innovation challenge</option>
                  <option>Mentorship</option>
                </select>
              </Field>
              <Field label="Title">
                <input
                  name="title"
                  className="field"
                  required
                  minLength={5}
                  maxLength={160}
                />
              </Field>
              <Field label="Brief, expected outputs and scope">
                <textarea
                  name="description"
                  className="field"
                  required
                  minLength={30}
                  maxLength={5000}
                />
              </Field>
              <Field
                label="Judging rubric / mentorship success criteria"
                hint="State how entries will be judged or how mentorship goals will be reviewed. Do not claim unconfirmed prizes or credentials."
              >
                <textarea
                  name="criteria"
                  className="field"
                  required
                  minLength={30}
                  maxLength={4000}
                />
              </Field>
              <Field label="Audience">
                <select name="audience" className="field">
                  <option value="student">Students</option>
                  <option value="academician">Academicians</option>
                  <option value="all">Both</option>
                </select>
              </Field>
              <Field label="Submission/request deadline (your local timezone)">
                <input
                  name="deadline"
                  className="field"
                  type="datetime-local"
                  required
                />
              </Field>
              <Field label="Maximum non-withdrawn submissions or mentorship requests">
                <input
                  name="capacity"
                  type="number"
                  className="field"
                  required
                  min={1}
                  max={1000}
                />
              </Field>
              <SaveButton busy={action.busy}>Publish fixed criteria</SaveButton>
            </form>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          {[
            "Discover",
            "Participating",
            ...(role === "student" ? [] : ["Hosted"]),
          ].map((v) => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              onClick={() => setView(v)}
            >
              {v}
            </Button>
          ))}
        </div>
        {!state.loading && !state.error && !initiatives.length && (
          <Empty
            title="Nothing in this view yet"
            description="Actual published initiatives and your participation will appear here."
          />
        )}
        {initiatives.map((i) => (
          <article key={i.id} className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex gap-2">
              <Tag>{i.kind}</Tag>
              <Tag>{i.status}</Tag>
            </div>
            <h2 className="text-2xl font-semibold">{i.title}</h2>
            <p className="text-sm text-muted-foreground">
              {i.publisher_name} · {i.audience} · Deadline{" "}
              {new Date(i.deadline).toLocaleString()} · Capacity {i.capacity}
            </p>
            <p className="whitespace-pre-wrap">{i.description}</p>
            <details>
              <summary className="font-semibold cursor-pointer">
                Published criteria
              </summary>
              <p className="mt-3 whitespace-pre-wrap text-sm">{i.criteria}</p>
            </details>
            {i.owner_id === me && i.status === "Open" && (
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Close new submissions? Existing mentorships and reviews will remain active.",
                    )
                  )
                    void action.run(
                      () =>
                        initiativeAction("close_initiative", {
                          initiative: i.id,
                        }),
                      "New submissions closed.",
                    );
                }}
              >
                Close new submissions
              </Button>
            )}
            {["student", "academician"].includes(role) &&
              i.owner_id !== me &&
              ["all", role].includes(i.audience) &&
              i.status === "Open" &&
              !state.data?.entries.some(
                (e) => e.initiative_id === i.id && e.learner_id === me,
              ) && (
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void action.run(
                      () =>
                        initiativeAction("submit_initiative_entry", {
                          initiative: i.id,
                          proposal_text: f.get("proposal"),
                          evidence: f.get("evidence"),
                        }),
                      "Submitted. Your proposal and linked evidence are visible to the organizer.",
                    );
                  }}
                >
                  <Field
                    label={
                      i.kind === "Mentorship"
                        ? "Your goals and support needed"
                        : "Submission summary"
                    }
                  >
                    <textarea
                      name="proposal"
                      className="field"
                      required
                      minLength={30}
                      maxLength={5000}
                    />
                  </Field>
                  <Field
                    label={
                      i.kind === "Mentorship"
                        ? "Optional portfolio/evidence URL"
                        : "Submission evidence URL"
                    }
                  >
                    <input
                      type="url"
                      name="evidence"
                      pattern="https://.*"
                      className="field"
                      required={i.kind === "Innovation challenge"}
                      maxLength={2000}
                    />
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    One submission per account; submitted content is fixed. The
                    organizer sees your name and evidence. Check permissions on
                    external links.
                  </p>
                  <SaveButton busy={action.busy}>
                    {i.kind === "Mentorship"
                      ? "Request mentorship"
                      : "Submit challenge entry"}
                  </SaveButton>
                </form>
              )}
            {state.data?.entries
              .filter((e) => e.initiative_id === i.id)
              .map((e) => (
                <Entry key={e.id} entry={e} initiative={i} me={me ?? ""} />
              ))}
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
function Entry({
  entry: e,
  initiative: i,
  me,
}: {
  entry: InitiativeEntry;
  initiative: Initiative;
  me: string;
}) {
  const state = useInitiatives(),
    action = useAction(),
    owner = i.owner_id === me;
  const choices: string[] = [];
  if (
    !owner &&
    ["Submitted", "Requested", "Active", "Completion requested"].includes(
      e.status,
    )
  )
    choices.push("Withdraw");
  if (i.kind === "Innovation challenge" && owner && e.status === "Submitted")
    choices.push("Review");
  if (i.kind === "Mentorship") {
    if (owner && e.status === "Requested") choices.push("Accept", "Decline");
    if (e.status === "Active")
      choices.push("Progress", ...(!owner ? ["Request completion"] : []));
    if (owner && e.status === "Completion requested")
      choices.push("Continue", "Complete");
  }
  return (
    <section className="glass-row rounded-2xl p-5 space-y-3">
      <p className="font-semibold">
        {e.learner_name} · {e.status}
      </p>
      <p className="text-sm whitespace-pre-wrap">{e.proposal}</p>
      {e.evidence_url && (
        <a
          className="text-sm role-text"
          href={e.evidence_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Submission evidence ↗
        </a>
      )}
      {e.score !== null && (
        <p className="text-sm">
          Organizer score: {e.score}/100 — not a certified skill assessment
        </p>
      )}
      {e.feedback && (
        <p className="text-sm whitespace-pre-wrap">{e.feedback}</p>
      )}
      {action.feedback}
      {choices.length > 0 && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const f = new FormData(event.currentTarget);
            const decision = String(f.get("decision"));
            if (
              decision === "Progress" ||
              window.confirm(
                `Record ${decision.toLowerCase()}? This decision is retained in history.`,
              )
            )
              void action.run(
                () =>
                  initiativeAction("update_initiative_entry", {
                    entry: e.id,
                    decision,
                    notes: f.get("notes"),
                    points:
                      f.get("points") === "" || f.get("points") === null
                        ? null
                        : Number(f.get("points")),
                  }),
                "Workspace updated.",
              );
          }}
        >
          <Field label="Action">
            <select name="decision" className="field">
              {choices.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Progress / review explanation">
            <textarea
              name="notes"
              className="field"
              required
              minLength={10}
              maxLength={4000}
            />
          </Field>
          {choices.includes("Review") && (
            <Field label="Score (0–100). Judging opens after the submission deadline.">
              <input
                name="points"
                type="number"
                className="field"
                required
                min={0}
                max={100}
              />
            </Field>
          )}
          <SaveButton busy={action.busy}>Save action</SaveButton>
        </form>
      )}
      <details>
        <summary className="cursor-pointer text-sm font-semibold">
          Progress & decision history
        </summary>
        {state.data?.journal
          .filter((j) => j.entry_id === e.id)
          .sort((a, b) => a.created_at.localeCompare(b.created_at))
          .map((j) => (
            <p key={j.id} className="text-sm whitespace-pre-wrap mt-3">
              {new Date(j.created_at).toLocaleString()} · {j.kind}: {j.message}
            </p>
          ))}
      </details>
    </section>
  );
}
