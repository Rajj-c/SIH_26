"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDownloadButton } from "./interview-calendar-button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { usePlatformData, type Role } from "@/lib/platform-store";
import { useLearningPrograms } from "@/lib/learning-programs";
import { useLearningSessions, sessionAction } from "@/lib/learning-sessions";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  SaveButton,
  Tag,
  Metric,
  useAction,
} from "./primitives";
export function LearningSessions({ role }: { role: Role }) {
  const platform = usePlatformData(),
    state = useLearningSessions(),
    programs = useLearningPrograms(),
    action = useAction();
  const me = platform.data?.profile.id;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [filter, setFilter] = useState(
    role === "industry"
      ? "My sessions"
      : role === "institution"
        ? "Approved members"
        : "Discover",
  );
  const cohort = new Set(
    platform.data?.memberships
      .filter((m) => m.institution_id === me && m.status === "Approved")
      .map((m) => m.member_id) ?? [],
  );
  const relevant =
    state.data?.registrations.filter((r) =>
      filter === "Approved members"
        ? cohort.has(r.learner_id)
        : filter === "My registrations"
          ? r.learner_id === me
          : true,
    ) ?? [];
  const sessions = (state.data?.sessions ?? [])
    .filter((s) =>
      filter === "My sessions"
        ? s.owner_id === me
        : filter === "My registrations" || filter === "Approved members"
          ? relevant.some((r) => r.session_id === s.id)
          : role === "industry" ||
            role === "institution" ||
            s.owner_id === me ||
            ["all", role].includes(s.audience),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <DashboardShell role={role} title="Sessions & events">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Learn together, in real time"
          title="Make collaboration a shared experience."
          description="Workshops, guest lectures and mentorship with real registration, organizer-recorded attendance and participant feedback. Registration is not attendance, and attendance is not a certification."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...state} retry={state.refresh} />
        {action.feedback}
        {platform.data && state.data && !platform.error && !state.error && (
          <>
            {role !== "student" && (
              <details className="glass-panel rounded-3xl p-6">
                <summary className="cursor-pointer font-semibold">
                  Schedule a session
                </summary>
                <form
                  className="mt-5 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const payload = Object.fromEntries(f);
                    void action.run(
                      () =>
                        sessionAction("schedule_learning_session", {
                          payload: {
                            ...payload,
                            capacity: Number(f.get("capacity")),
                            starts_at: new Date(
                              String(f.get("starts_at")),
                            ).toISOString(),
                            ends_at: new Date(
                              String(f.get("ends_at")),
                            ).toISOString(),
                            registration_closes_at: new Date(
                              String(f.get("registration_closes_at")),
                            ).toISOString(),
                          },
                        }),
                      "Session published. Meeting details are restricted to you and registered participants.",
                    );
                  }}
                >
                  <p className="text-xs text-muted-foreground">
                    Times are entered in {zone}. Published schedules are fixed:
                    cancel and create a new session if timing changes. Speaker
                    information is organizer-provided, not independently
                    verified.
                  </p>
                  <Field label="Session title">
                    <input
                      name="title"
                      className="field"
                      required
                      minLength={5}
                      maxLength={160}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field label="Format">
                      <select name="kind" className="field">
                        <option>Workshop</option>
                        <option>Guest lecture</option>
                        <option>Mentorship</option>
                      </select>
                    </Field>
                    <Field label="Audience">
                      <select name="audience" className="field">
                        <option value="all">Students and academicians</option>
                        <option value="student">Students</option>
                        <option value="academician">Academicians</option>
                      </select>
                    </Field>
                    <Field label="Delivery">
                      <select name="mode" className="field">
                        <option>Online</option>
                        <option>On-site</option>
                        <option>Hybrid</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Speaker / mentor">
                    <input
                      name="speaker"
                      className="field"
                      required
                      minLength={2}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Agenda and preparation">
                    <textarea
                      name="agenda"
                      className="field"
                      required
                      minLength={20}
                      maxLength={4000}
                    />
                  </Field>
                  <Field label="Private venue / meeting link">
                    <input
                      name="location"
                      className="field"
                      required
                      minLength={3}
                      maxLength={2000}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-3">
                    {[
                      ["starts_at", "Starts"],
                      ["ends_at", "Ends (maximum 12 hours)"],
                      ["registration_closes_at", "Registration deadline"],
                    ].map(([name, label]) => (
                      <Field key={name} label={label}>
                        <input
                          type="datetime-local"
                          name={name}
                          className="field"
                          required
                        />
                      </Field>
                    ))}
                  </div>
                  <Field label="Capacity (1–1000)">
                    <input
                      name="capacity"
                      type="number"
                      className="field"
                      required
                      min={1}
                      max={1000}
                      defaultValue={30}
                    />
                  </Field>
                  <Field label="Optional linked learning program">
                    <select
                      name="program_id"
                      className="field"
                      disabled={!programs.data || !!programs.error}
                    >
                      <option value="">Standalone session</option>
                      {programs.data?.programs
                        .filter(
                          (p) =>
                            p.opportunity.owner_id === me &&
                            p.opportunity.status === "Open",
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.opportunity.title}
                          </option>
                        ))}
                    </select>
                  </Field>
                  {programs.error && (
                    <p className="text-xs text-muted-foreground">
                      Program links unavailable; you can publish a standalone
                      session.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Linked sessions must fall within program dates. Learners
                    must enroll in that program before registering here.
                    Attendance does not complete the program automatically.
                  </p>
                  <SaveButton busy={action.busy}>Publish session</SaveButton>
                </form>
              </details>
            )}
            <Field label="Session view">
              <select
                className="field"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option>Discover</option>
                {role !== "student" && <option>My sessions</option>}
                {["student", "academician"].includes(role) && (
                  <option>My registrations</option>
                )}
                {role === "institution" && <option>Approved members</option>}
              </select>
            </Field>
            {filter === "Approved members" && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Cohort registrations (not attendance)"
                  value={
                    relevant.filter((r) => r.status === "Registered").length
                  }
                />
                <Metric
                  label="Organizer-recorded present"
                  value={
                    relevant.filter(
                      (r) =>
                        r.status === "Registered" && r.attendance === "Present",
                    ).length
                  }
                />
                <Metric
                  label="Completed-session participation"
                  value={
                    relevant.filter(
                      (r) =>
                        r.attendance === "Present" &&
                        r.status === "Registered" &&
                        state.data!.sessions.some(
                          (s) =>
                            s.id === r.session_id && s.status === "Completed",
                        ),
                    ).length
                  }
                />
              </div>
            )}
            {sessions.map((s) => {
              const owner = s.owner_id === me,
                own = state.data!.registrations.find(
                  (r) => r.session_id === s.id && r.learner_id === me,
                ),
                roster = relevant.filter((r) => r.session_id === s.id),
                location = state.data!.access.find(
                  (a) => a.session_id === s.id,
                )?.location;
              return (
                <article
                  key={s.id}
                  className="glass-panel space-y-4 rounded-3xl p-6"
                >
                  <div className="flex flex-wrap gap-2">
                    <Tag>{s.kind}</Tag>
                    <Tag>{s.status}</Tag>
                    <Tag>{s.mode}</Tag>
                    {own && (
                      <Tag>
                        {own.status} · {own.attendance}
                      </Tag>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold">{s.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Speaker: {s.speaker} ·{" "}
                    {new Date(s.starts_at).toLocaleString()} –{" "}
                    {new Date(s.ends_at).toLocaleString()} ({zone})
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{s.agenda}</p>
                  <p className="text-xs text-muted-foreground">
                    Audience: {s.audience} · Capacity: {s.capacity} · Register
                    by {new Date(s.registration_closes_at).toLocaleString()}.
                    Capacity is checked when registering.
                  </p>
                  {s.program_id && (
                    <Link
                      className="block text-sm role-text"
                      href={`/${role}/programs?program=${s.program_id}`}
                    >
                      Linked program / enrollment ↗
                    </Link>
                  )}
                  {location && s.status === "Scheduled" && (
                    <CalendarDownloadButton id={s.id} kind="session" />
                  )}
                  {location && (
                    <p className="whitespace-pre-wrap break-words text-sm">
                      Private meeting details: {location}
                    </p>
                  )}
                  {!owner &&
                    ["student", "academician"].includes(role) &&
                    s.status === "Scheduled" &&
                    new Date(s.starts_at).getTime() > now && (
                      <Button
                        disabled={
                          action.busy ||
                          (own?.status !== "Registered" &&
                            new Date(s.registration_closes_at).getTime() <= now)
                        }
                        onClick={() =>
                          void action.run(
                            () =>
                              sessionAction("register_learning_session", {
                                session: s.id,
                                joining: own?.status !== "Registered",
                              }),
                            own?.status === "Registered"
                              ? "Registration cancelled."
                              : "Registered. This does not record attendance.",
                          )
                        }
                      >
                        {own?.status === "Registered"
                          ? "Cancel registration"
                          : "Register for session"}
                      </Button>
                    )}
                  {owner && s.status === "Scheduled" && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={action.busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Cancel this session and notify registered learners? Calendar copies must be removed manually.",
                            )
                          )
                            void action.run(
                              () =>
                                sessionAction("finish_learning_session", {
                                  session: s.id,
                                  decision: "Cancelled",
                                }),
                              "Session cancelled.",
                            );
                        }}
                      >
                        Cancel session
                      </Button>
                      <Button
                        disabled={
                          action.busy || new Date(s.ends_at).getTime() > now
                        }
                        onClick={() => {
                          if (
                            window.confirm(
                              "Complete this session? Attendance becomes final and cannot be edited.",
                            )
                          )
                            void action.run(
                              () =>
                                sessionAction("finish_learning_session", {
                                  session: s.id,
                                  decision: "Completed",
                                }),
                              "Session completed. Present participants can submit feedback.",
                            );
                        }}
                      >
                        Complete session
                      </Button>
                    </div>
                  )}
                  {(owner || role === "institution") && (
                    <div className="space-y-3">
                      <h3 className="font-semibold">
                        {owner
                          ? "Organizer roster"
                          : "Approved-member participation"}
                      </h3>
                      {roster.map((r) => (
                        <div key={r.id} className="glass-row rounded-2xl p-4">
                          <p className="text-sm">
                            {r.learner_name} · {r.status} · {r.attendance}
                          </p>
                          {owner &&
                            s.status === "Scheduled" &&
                            r.status === "Registered" &&
                            new Date(s.starts_at).getTime() <= now && (
                              <div className="mt-3 flex gap-2">
                                {["Present", "Absent"].map((decision) => (
                                  <Button
                                    key={decision}
                                    variant="outline"
                                    disabled={action.busy}
                                    onClick={() =>
                                      void action.run(
                                        () =>
                                          sessionAction(
                                            "record_session_attendance",
                                            { registration: r.id, decision },
                                          ),
                                        "Attendance saved by organizer. No credential was issued.",
                                      )
                                    }
                                  >
                                    {decision}
                                  </Button>
                                ))}
                              </div>
                            )}
                          {r.feedback_at && (
                            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                              Feedback: {r.rating}/5 · {r.feedback}
                            </p>
                          )}
                        </div>
                      ))}
                      {!roster.length && (
                        <p className="text-sm text-muted-foreground">
                          No registrations visible in this view.
                        </p>
                      )}
                    </div>
                  )}
                  {own?.attendance === "Present" &&
                    own.status === "Registered" &&
                    s.status === "Completed" &&
                    !own.feedback_at && (
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          const f = new FormData(e.currentTarget);
                          void action.run(
                            () =>
                              sessionAction("submit_session_feedback", {
                                registration: own.id,
                                score: Number(f.get("score")),
                                comments: String(f.get("comments")),
                              }),
                            "Feedback submitted.",
                          );
                        }}
                      >
                        <Field label="Your rating">
                          <select name="score" className="field">
                            {[5, 4, 3, 2, 1].map((n) => (
                              <option key={n}>{n}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Feedback (visible to organizer and approved institutions)">
                          <textarea
                            name="comments"
                            className="field"
                            required
                            minLength={10}
                            maxLength={2000}
                          />
                        </Field>
                        <SaveButton busy={action.busy}>
                          Submit feedback once
                        </SaveButton>
                      </form>
                    )}
                  {own?.feedback_at && (
                    <p className="text-sm text-muted-foreground">
                      Your feedback: {own.rating}/5 · {own.feedback}
                    </p>
                  )}
                </article>
              );
            })}
            {!sessions.length && (
              <Empty
                title="No sessions in this view"
                description="Published sessions and your saved participation will appear here. No example events are inserted."
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
