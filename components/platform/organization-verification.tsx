"use client";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { usePlatformData, type Role } from "@/lib/platform-store";
import {
  useOrganizationVerification,
  verificationAction,
} from "@/lib/organization-verification";
import {
  PageHeading,
  DataState,
  Empty,
  Field,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
export function OrganizationVerification({ role }: { role: Role }) {
  const platform = usePlatformData(),
    state = useOrganizationVerification(),
    action = useAction();
  const owned =
    state.data?.requests.filter(
      (r) => r.owner_id === platform.data?.profile.id,
    ) ?? [];
  return (
    <DashboardShell role={role} title="Organization trust">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Accountability by design"
          title="Put evidence behind your organization."
          description="A platform reviewer checks the exact organization name and supporting sources. Review does not establish government accreditation, course quality or a legal endorsement."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...state} retry={state.refresh} />
        {action.feedback}
        {state.data && (
          <>
            {["industry", "institution"].includes(role) &&
              !owned.some((r) =>
                ["Pending", "Approved"].includes(r.status),
              ) && (
                <form
                  className="glass-panel rounded-3xl p-6 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    void action.run(
                      () =>
                        verificationAction(
                          "request_organization_verification",
                          { payload: Object.fromEntries(f) },
                        ),
                      "Verification request submitted. It is not approved until a platform reviewer checks it.",
                    );
                  }}
                >
                  <Field label="Exact legal organization name">
                    <input
                      name="legal_name"
                      className="field"
                      required
                      minLength={3}
                      maxLength={200}
                    />
                  </Field>
                  <Field label="Official organization website">
                    <input
                      type="url"
                      pattern="https://.*"
                      name="website"
                      className="field"
                      required
                      maxLength={2000}
                    />
                  </Field>
                  <Field label="Public registry or official evidence URL">
                    <input
                      type="url"
                      pattern="https://.*"
                      name="evidence_url"
                      className="field"
                      required
                      maxLength={2000}
                    />
                  </Field>
                  <Field
                    label="Explain the evidence and your authority to represent the organization"
                    hint="Do not submit passwords, identity-document numbers or confidential files. Reviewers see this explanation."
                  >
                    <textarea
                      name="explanation"
                      className="field"
                      required
                      minLength={30}
                      maxLength={4000}
                    />
                  </Field>
                  <SaveButton busy={action.busy}>
                    Request verification
                  </SaveButton>
                </form>
              )}
            {state.data.reviewer && (
              <p className="glass-panel rounded-2xl p-4 text-sm">
                Reviewer access enabled. Check sources independently, record
                what you checked, and reject insufficient evidence. You cannot
                review your own organization. Latest 500 requests and 1,000
                history events are shown.
              </p>
            )}
            {!state.data.requests.length && (
              <Empty
                title="No verification requests"
                description="Requests and review history will appear here. Administrator access is explicitly configured, never assigned during signup."
              />
            )}
            {state.data.requests.map((r) => (
              <article
                key={r.id}
                className="glass-panel rounded-3xl p-6 space-y-4"
              >
                <Tag>{r.status}</Tag>
                <h2 className="text-xl font-semibold">{r.legal_name}</h2>
                <div className="flex flex-wrap gap-4 text-sm role-text">
                  <a href={r.website} target="_blank" rel="noopener noreferrer">
                    Official website ↗
                  </a>
                  <a
                    href={r.evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Submitted evidence ↗
                  </a>
                </div>
                <p className="whitespace-pre-wrap text-sm">{r.explanation}</p>
                {r.reason && <p className="text-sm">Review: {r.reason}</p>}
                {state.data!.reviewer &&
                  r.owner_id !== platform.data?.profile.id &&
                  ["Pending", "Approved"].includes(r.status) && (
                    <form
                      className="space-y-3"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const f = new FormData(e.currentTarget);
                        if (
                          window.confirm(
                            "Record this organization review? The decision and reason will be retained in audit history.",
                          )
                        )
                          void action.run(
                            () =>
                              verificationAction("review_organization", {
                                request_id: r.id,
                                decision: f.get("decision"),
                                review_reason: f.get("reason"),
                              }),
                            "Review recorded.",
                          );
                      }}
                    >
                      <Field label="Decision">
                        <select name="decision" className="field">
                          {(r.status === "Pending"
                            ? ["Rejected", "Approved"]
                            : ["Revoked"]
                          ).map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Sources checked and reason">
                        <textarea
                          name="reason"
                          className="field"
                          required
                          minLength={20}
                          maxLength={2000}
                        />
                      </Field>
                      <SaveButton busy={action.busy}>
                        Record decision
                      </SaveButton>
                    </form>
                  )}
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">
                    Review history
                  </summary>
                  {state
                    .data!.events.filter((h) => h.organization_id === r.id)
                    .map((h) => (
                      <p
                        key={h.id}
                        className="mt-3 text-sm whitespace-pre-wrap"
                      >
                        {new Date(h.created_at).toLocaleString()} · {h.action} —{" "}
                        {h.reason}
                      </p>
                    ))}
                </details>
              </article>
            ))}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
