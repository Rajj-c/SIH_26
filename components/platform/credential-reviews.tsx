"use client";
import Link from "next/link";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { usePlatformData } from "@/lib/platform-store";
import { supabase } from "@/lib/supabase/client";
import { useCredentialReviews } from "@/lib/credential-reviews";
import { DocumentLink } from "./document-link";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
export function CredentialReviews({
  role,
  selectedRequest = "",
}: {
  role: "student" | "institution";
  selectedRequest?: string;
}) {
  const platform = usePlatformData(),
    reviews = useCredentialReviews(),
    action = useAction();
  const data = platform.data;
  const [status, setStatus] = useState("All");
  const requests = reviews.data?.requests ?? [];
  const visible = requests.filter((r) =>
    selectedRequest
      ? r.id === selectedRequest
      : status === "All" || r.status === status,
  );
  async function run(
    name: "request_credential_review" | "decide_credential_review",
    args: Record<string, unknown>,
  ) {
    const { error } = await supabase.rpc(name, args);
    if (error) throw error;
    await reviews.refresh();
  }
  return (
    <DashboardShell role={role} title="Credential reviews">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Evidence with accountability"
          title="Review the credential. Preserve the history."
          description="Institution review records a human decision about a submitted certificate version. It is not issuer authentication, accreditation or proof of skill proficiency."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...reviews} retry={reviews.refresh} />
        {action.feedback}
        {data && reviews.data && !platform.error && !reviews.error && (
          <>
            <div className="glass-panel space-y-3 rounded-3xl p-5">
              {selectedRequest ? (
                <>
                  <p className="text-sm">
                    Showing the review linked from your inbox. Its current
                    status may differ from the original notification.
                  </p>
                  <Link
                    className="text-sm font-semibold role-text"
                    href={`/${role}/credential-reviews`}
                  >
                    View all credential reviews ↗
                  </Link>
                </>
              ) : (
                <Field label="Review queue">
                  <select
                    className="field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {[
                      "All",
                      "Pending",
                      "Approved",
                      "Changes requested",
                      "Declined",
                      "Revoked",
                      "Superseded",
                    ].map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </Field>
              )}
              <p className="text-xs text-muted-foreground">
                New requests and decisions appear in the notification inbox.
                Notifications do not grant access or prove issuer authenticity.
              </p>
            </div>
            {role === "student" && (
              <form
                className="glass-panel space-y-4 rounded-3xl p-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action.run(
                    () =>
                      run("request_credential_review", {
                        record: String(f.get("record")),
                        institution: String(f.get("institution")),
                      }),
                    "Review requested. An unchanged pending or approved request is reused.",
                  );
                }}
              >
                <h2 className="text-xl font-semibold">
                  Request institution review
                </h2>
                <Field label="Your certificate">
                  <select name="record" className="field" required>
                    <option value="">Choose a certificate</option>
                    {data.records
                      .filter(
                        (r) =>
                          r.user_id === data.profile.id &&
                          r.kind === "certification",
                      )
                      .map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Approved institution">
                  <select name="institution" className="field" required>
                    <option value="">Choose an institution</option>
                    {data.memberships
                      .filter(
                        (m) =>
                          m.member_id === data.profile.id &&
                          m.status === "Approved",
                      )
                      .map((m) => (
                        <option key={m.id} value={m.institution_id}>
                          {data.directory.find((p) => p.id === m.institution_id)
                            ?.full_name || m.institution_id}
                        </option>
                      ))}
                  </select>
                </Field>
                <p className="text-xs text-muted-foreground">
                  Your institution can already access your portfolio through
                  approved membership. This creates a private review request and
                  immutable certificate snapshot. Add issuer details and
                  evidence before requesting.
                </p>
                <SaveButton busy={action.busy}>Request review</SaveButton>
                <Link
                  className="block text-sm role-text"
                  href="/student/portfolio"
                >
                  Manage certificates and corrections ↗
                </Link>
              </form>
            )}
            {visible
              .slice()
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .map((r) => {
                const expired =
                  r.snapshot.expires_on &&
                  r.snapshot.expires_on <
                    new Date().toLocaleDateString("en-CA", {
                      timeZone: "Asia/Kolkata",
                    });
                return (
                  <article
                    key={r.id}
                    className="glass-panel space-y-4 rounded-3xl p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {r.snapshot.title}
                      </h2>
                      <Tag
                        positive={
                          r.status === "Approved" && r.is_current && !expired
                        }
                      >
                        {r.status === "Approved"
                          ? "Institution-reviewed version"
                          : r.status}
                      </Tag>
                      {!r.is_current && (
                        <Tag>Changed or deleted · historical version only</Tag>
                      )}
                      {expired && <Tag>Expired</Tag>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Issuer entered: {r.snapshot.organization} · Credential ID:{" "}
                      {r.snapshot.credential_id || "Not provided"}
                    </p>
                    <p className="text-sm">
                      Student:{" "}
                      {data.directory.find((p) => p.id === r.student_id)
                        ?.full_name || r.student_id}{" "}
                      · Institution:{" "}
                      {data.directory.find((p) => p.id === r.institution_id)
                        ?.full_name || r.institution_id}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      {r.snapshot.description}
                    </p>
                    {r.snapshot.url && /^https?:\/\//i.test(r.snapshot.url) && (
                      <a
                        href={r.snapshot.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm role-text"
                      >
                        Open submitted evidence link ↗
                      </a>
                    )}
                    {r.is_current && r.snapshot.document_path && (
                      <DocumentLink path={r.snapshot.document_path} />
                    )}
                    <details open={selectedRequest === r.id}>
                      <summary className="cursor-pointer text-sm font-semibold">
                        Review history
                      </summary>
                      <div className="mt-3 space-y-3">
                        {reviews
                          .data!.events.filter((e) => e.request_id === r.id)
                          .sort(
                            (a, b) =>
                              a.created_at.localeCompare(b.created_at) ||
                              a.id.localeCompare(b.id),
                          )
                          .map((e) => (
                            <div
                              key={e.id}
                              className="glass-row rounded-xl p-3"
                            >
                              <p className="text-sm font-semibold">
                                {e.decision} ·{" "}
                                {new Date(e.created_at).toLocaleString()}
                              </p>
                              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                                {e.feedback}
                              </p>
                            </div>
                          ))}
                      </div>
                    </details>
                    {role === "institution" &&
                      r.institution_id === data.profile.id &&
                      ((r.status === "Pending" && r.is_current) ||
                        r.status === "Approved") && (
                        <form
                          className="space-y-3 border-t border-border pt-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void action.run(
                              () =>
                                run("decide_credential_review", {
                                  request: r.id,
                                  decision: String(f.get("decision")),
                                  feedback: String(f.get("feedback")),
                                }),
                              "Review decision recorded. No assessed skill or issuer verification was created.",
                            );
                          }}
                        >
                          <Field label="Decision">
                            <select name="decision" className="field">
                              {r.status === "Approved" ? (
                                <option>Revoked</option>
                              ) : (
                                <>
                                  <option>Changes requested</option>
                                  <option>Declined</option>
                                  <option disabled={!!expired}>Approved</option>
                                </>
                              )}
                            </select>
                          </Field>
                          <Field label="Review reasoning / corrections required">
                            <textarea
                              name="feedback"
                              className="field"
                              required
                              minLength={10}
                              maxLength={3000}
                            />
                          </Field>
                          <p className="text-xs text-muted-foreground">
                            Check the submitted evidence yourself. Approve only
                            what your institution can substantiate; explain the
                            scope of your review. AI does not decide
                            authenticity.
                          </p>
                          <SaveButton busy={action.busy}>
                            Record decision
                          </SaveButton>
                        </form>
                      )}
                    <p className="break-all text-xs text-muted-foreground">
                      Review reference: {r.id}
                    </p>
                  </article>
                );
              })}
            {!visible.length && (
              <Empty
                title={
                  selectedRequest
                    ? "Review unavailable"
                    : "No reviews in this queue"
                }
                description={
                  selectedRequest
                    ? "This review is unavailable to your account. Membership or permissions may have changed. Return to all reviews to continue."
                    : "Student requests to an approved institution will appear here. Choose another queue to see other decisions."
                }
              />
            )}
          </>
        )}
      </div>
    </DashboardShell>
  );
}
