"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Handshake, ArrowUpRight } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { usePlatformData, type Role } from "@/lib/platform-store";
import {
  useCollaborations,
  collaborationAction,
  type Collaboration,
  type CollaborationMember,
} from "@/lib/collaborations";
import {
  DataState,
  Empty,
  Field,
  PageHeading,
  SaveButton,
  Tag,
  useAction,
} from "./primitives";
type FormField = {
  name: string;
  label: string;
  type?: "text" | "date" | "url" | "select";
  min?: number;
  max?: number;
  optional?: boolean;
  options?: { value: string; label: string }[];
};
function CollaborationForm({
  action,
  args,
  fields,
  label,
  confirm,
}: {
  action: Parameters<typeof collaborationAction>[0];
  args: Record<string, unknown>;
  fields: FormField[];
  label: string;
  confirm?: string;
}) {
  const state = useAction();
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const payload = {
          ...args,
          ...Object.fromEntries(
            fields.map((f) => [
              f.name,
              f.name === "milestone"
                ? String(fd.get(f.name)) || null
                : String(fd.get(f.name) ?? ""),
            ]),
          ),
        };
        if (confirm && !window.confirm(confirm)) return;
        if (
          await state.run(
            () => collaborationAction(action, payload),
            "Workspace updated.",
          )
        )
          form.reset();
      }}
    >
      {state.feedback}
      {fields.map((f) => (
        <Field key={f.name} label={f.label}>
          {f.type === "select" ? (
            <select name={f.name} className="field" required={!f.optional}>
              {f.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : f.type ? (
            <input
              className="field"
              name={f.name}
              type={f.type}
              required={!f.optional}
              minLength={f.min}
              maxLength={f.max}
              pattern={f.type === "url" ? "https://.*" : undefined}
            />
          ) : (
            <textarea
              className="field min-h-24"
              name={f.name}
              required={!f.optional}
              minLength={f.min ?? 10}
              maxLength={f.max ?? 3000}
            />
          )}
        </Field>
      ))}
      <SaveButton busy={state.busy}>{label}</SaveButton>
    </form>
  );
}

export function CollaborationsWorkspace({ role }: { role: Role }) {
  const platform = usePlatformData();
  const state = useCollaborations();
  const [browse, setBrowse] = useState(false);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState("");
  useEffect(
    () =>
      setFocused(
        new URLSearchParams(window.location.search).get("proposal") ?? "",
      ),
    [],
  );
  const me = platform.data?.profile;
  const calls =
    platform.data?.opportunities
      .filter(
        (o) =>
          o.ownerId !== me?.id &&
          ["Research", "Consultancy", "Live Project"].includes(o.type) &&
          ["all", "academician"].includes(o.audience) &&
          o.status === "Open" &&
          o.deadline >=
            new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Kolkata",
            }),
      )
      .filter((o) => {
        const publisher = platform.data?.directory.find(
          (p) => p.id === o.ownerId,
        );
        return (
          !publisher ||
          (role === "industry"
            ? ["academician", "institution"].includes(publisher.role)
            : publisher.role === "industry")
        );
      })
      .filter((o) =>
        [o.title, o.company, ...o.skills]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase()),
      ) ?? [];
  const proposals =
    state.data?.proposals
      .filter(
        (p) =>
          (!focused || focused === p.id) &&
          [p.title, p.organization, p.proposer_name]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at)) ?? [];
  return (
    <DashboardShell role={role} title="Collaboration workspace">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Industry × academia"
          title="Turn shared expertise into real work."
          description="Research, consultancy and live-project partnerships with scoped project teams. Both original partners must approve sharing before an invited member can accept workspace access."
        />
        <DataState {...platform} retry={platform.refresh} />
        <DataState {...state} retry={state.refresh} />
        {me && state.data && !state.error && !platform.error && (
          <>
            {state.data.members
              .filter(
                (m) =>
                  m.member_id === me.id &&
                  ["Invited", "Awaiting partner"].includes(m.status),
              )
              .map((m) => (
                <TeamInvitation key={m.id} member={m} me={me.id} />
              ))}
            <div className="glass-panel flex flex-wrap gap-3 rounded-2xl p-4">
              <Button
                variant={browse ? "outline" : "default"}
                onClick={() => setBrowse(false)}
              >
                My partnerships ({state.data.proposals.length})
              </Button>
              {role !== "student" && (
                <Button
                  variant={browse ? "default" : "outline"}
                  onClick={() => setBrowse(true)}
                >
                  Explore open calls
                </Button>
              )}
              <input
                aria-label="Search collaborations"
                className="field flex-1"
                placeholder="Search project, partner or skill"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {focused && (
                <Button variant="outline" onClick={() => setFocused("")}>
                  Show all partnerships
                </Button>
              )}
            </div>
            {browse ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Eligible calls connect an industry account with an academician
                  or institution. For your own call, use{" "}
                  <Link
                    className="font-semibold role-text"
                    href={
                      role === "industry"
                        ? "/industry/post"
                        : `/${role}/publish`
                    }
                  >
                    Publish opportunity
                  </Link>{" "}
                  and choose Research, Consultancy or Live Project with an
                  academician/all audience.
                </p>
                <div className="grid items-start gap-5 xl:grid-cols-2">
                  {calls.map((o) => (
                    <article
                      key={o.id}
                      className="glass-panel space-y-5 rounded-3xl p-6"
                    >
                      <div className="flex items-center justify-between">
                        <Handshake className="h-6 w-6 role-text" />
                        <Tag>{o.type}</Tag>
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {o.company}
                      </p>
                      <h2 className="text-2xl font-semibold tracking-tight">
                        {o.title}
                      </h2>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {o.description}
                      </p>
                      <p className="text-sm">
                        {o.workMode} · {o.location} · Deadline {o.deadline}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {o.skills.map((s) => (
                          <Tag key={s}>{s}</Tag>
                        ))}
                      </div>
                      {state.data?.proposals.some(
                        (p) =>
                          p.opportunity_id === o.id && p.proposer_id === me.id,
                      ) ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFocused(
                              state.data?.proposals.find(
                                (p) =>
                                  p.opportunity_id === o.id &&
                                  p.proposer_id === me.id,
                              )?.id ?? "",
                            );
                            setBrowse(false);
                          }}
                        >
                          Open your proposal{" "}
                          <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <details className="border-t border-border pt-4">
                          <summary className="cursor-pointer font-semibold">
                            Prepare partnership proposal
                          </summary>
                          <div className="mt-4">
                            <CollaborationForm
                              action="submit_collaboration_proposal"
                              args={{ opportunity: o.id }}
                              label="Submit proposal"
                              confirm="Submit these fixed proposal terms to the opportunity owner? Your account name and organization will be shared. This is not a signed contract."
                              fields={[
                                {
                                  name: "objectives",
                                  label:
                                    "Problem, objectives and proposed approach",
                                  min: 30,
                                  max: 4000,
                                },
                                {
                                  name: "deliverables",
                                  label:
                                    "Deliverables and measurable success criteria",
                                  min: 20,
                                  max: 4000,
                                },
                                {
                                  name: "timeline",
                                  label: "Timeline and proposed checkpoints",
                                  min: 10,
                                  max: 2000,
                                },
                                {
                                  name: "resources",
                                  label:
                                    "Team, equipment, budget and resource assumptions",
                                  min: 10,
                                  max: 3000,
                                },
                                {
                                  name: "terms",
                                  label:
                                    "Confidentiality, intellectual property and publication expectations",
                                  min: 20,
                                  max: 4000,
                                },
                              ]}
                            />
                          </div>
                        </details>
                      )}
                    </article>
                  ))}
                </div>
                {!calls.length && (
                  <Empty
                    title="No eligible open calls found"
                    description="Publish a real collaboration opportunity or check back when a partner opens a call."
                  />
                )}
              </>
            ) : (
              <>
                <div className="space-y-6">
                  {proposals.map((p) => (
                    <Partnership key={p.id} proposal={p} userId={me.id} />
                  ))}
                </div>
                {!proposals.length && (
                  <Empty
                    title="Your partnerships start here"
                    description="Explore a partner's open call and submit a proposal, or publish your own opportunity to receive proposals."
                  />
                )}
              </>
            )}
            <p className="text-xs text-muted-foreground">
              Existing student live-project applications are unchanged.
              Partnership access does not expose unrelated profiles, assessment
              results or student records. Team invitations, payments and legally
              signed agreements are not included.
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  );
}

function TeamInvitation({
  member: m,
  me,
  proposal,
}: {
  member: CollaborationMember;
  me: string;
  proposal?: Collaboration;
}) {
  const action = useAction();
  const principal =
    proposal && [proposal.owner_id, proposal.proposer_id].includes(me);
  const choices: string[] = [];
  if (
    principal &&
    m.status === "Awaiting partner" &&
    m.invited_by !== me &&
    proposal?.status === "Accepted"
  )
    choices.push("Approve");
  if (
    principal &&
    ["Awaiting partner", "Invited", "Accepted"].includes(m.status)
  )
    choices.push("Revoke");
  if (m.member_id === me && m.status === "Invited")
    choices.push("Accept", "Decline");
  if (m.member_id === me && m.status === "Accepted") choices.push("Leave");
  return (
    <div className="glass-row space-y-3 rounded-2xl p-4">
      <p className="text-sm font-semibold">
        {m.workspace_title} · {m.member_name}
      </p>
      <p className="text-xs text-muted-foreground">
        {m.permission} · {m.status}
      </p>
      {action.feedback}
      <div className="flex gap-2 flex-wrap">
        {choices.map((decision) => (
          <Button
            key={decision}
            variant="outline"
            disabled={action.busy}
            onClick={() => {
              if (
                window.confirm(
                  `${decision} this invitation? Accepted members can read the full workspace, including terms and previous discussion. Contributors can post updates but cannot approve completion.`,
                )
              )
                void action.run(
                  () =>
                    collaborationAction("respond_collaboration_invitation", {
                      invitation: m.id,
                      decision,
                    }),
                  "Invitation updated.",
                );
            }}
          >
            {decision}
          </Button>
        ))}
      </div>
    </div>
  );
}
function TeamPanel({
  proposal: p,
  me,
}: {
  proposal: Collaboration;
  me: string;
}) {
  const state = useCollaborations(),
    platform = usePlatformData();
  const principal = [p.owner_id, p.proposer_id].includes(me);
  return (
    <details className="rounded-2xl border border-border p-4">
      <summary className="cursor-pointer font-semibold">
        Project team & access
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Both partners approve sharing the full workspace. Pending invitations
          grant no access. Revocation removes future access; previously
          downloaded or viewed information cannot be recalled.
        </p>
        {principal && p.status === "Accepted" && !p.completion_requested_at && (
          <CollaborationForm
            action="invite_collaboration_member"
            args={{ proposal: p.id }}
            label="Propose team invitation"
            confirm="Ask the other partner to approve sharing this workspace with the selected account?"
            fields={[
              {
                name: "person",
                label: "Existing account",
                type: "select",
                options: (platform.data?.directory ?? [])
                  .filter(
                    (person) =>
                      ![p.owner_id, p.proposer_id].includes(person.id),
                  )
                  .map((person) => ({
                    value: person.id,
                    label: `${person.full_name} · ${person.role} · ${person.id.slice(0, 8)}`,
                  })),
              },
              {
                name: "access_level",
                label: "Workspace permission",
                type: "select",
                options: [
                  { value: "Observer", label: "Observer — read only" },
                  {
                    value: "Contributor",
                    label: "Contributor — read and post updates",
                  },
                ],
              },
            ]}
          />
        )}
        {state.data?.members
          .filter((m) => m.proposal_id === p.id)
          .map((m) => (
            <TeamInvitation key={m.id} member={m} me={me} proposal={p} />
          ))}
      </div>
    </details>
  );
}

function ProjectFiles({
  proposal: p,
  me,
  canUpload,
}: {
  proposal: Collaboration;
  me: string;
  canUpload: boolean;
}) {
  const state = useCollaborations(),
    action = useAction();
  return (
    <details className="rounded-2xl border border-border p-4">
      <summary className="cursor-pointer font-semibold">
        Private project documents
      </summary>
      <div className="mt-4 space-y-4">
        {action.feedback}
        <p className="text-xs text-muted-foreground">
          PDF only, maximum 10 MB. Shared with all accepted workspace members.
          Download links expire after 60 seconds; downloaded copies cannot be
          revoked. Upload only trusted documents you have permission to share.
        </p>
        {canUpload && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action.run(async () => {
                const file = f.get("file");
                if (
                  !(file instanceof File) ||
                  file.type !== "application/pdf" ||
                  file.size > 10485760 ||
                  file.size === 0
                )
                  throw new Error("Choose a PDF up to 10 MB.");
                const path = `${me}/${p.id}/${crypto.randomUUID()}.pdf`;
                const { error } = await supabase.storage
                  .from("collaboration-files")
                  .upload(path, file, {
                    contentType: "application/pdf",
                    upsert: false,
                  });
                if (error) throw error;
                try {
                  await collaborationAction("register_collaboration_file", {
                    proposal: p.id,
                    file_title: f.get("title"),
                    path,
                  });
                } catch (error) {
                  await supabase.storage
                    .from("collaboration-files")
                    .remove([path]);
                  throw error;
                }
              }, "Project document shared.");
            }}
          >
            <Field label="Document title">
              <input
                name="title"
                className="field"
                required
                minLength={3}
                maxLength={160}
              />
            </Field>
            <Field label="Private PDF">
              <input
                name="file"
                type="file"
                accept="application/pdf"
                required
                className="field"
              />
            </Field>
            <SaveButton busy={action.busy}>Upload and share PDF</SaveButton>
          </form>
        )}
        {state.data?.files
          .filter((f) => f.proposal_id === p.id)
          .map((f) => (
            <div
              key={f.id}
              className="glass-row rounded-2xl p-4 flex flex-wrap justify-between gap-3"
            >
              <span className="text-sm">
                {f.title} · {new Date(f.created_at).toLocaleDateString()}
              </span>
              <Button
                variant="outline"
                disabled={action.busy}
                onClick={() =>
                  void action.run(async () => {
                    const { data, error } = await supabase.storage
                      .from("collaboration-files")
                      .createSignedUrl(f.storage_path, 60, { download: true });
                    if (error) throw error;
                    const link = document.createElement("a");
                    link.href = data.signedUrl;
                    link.rel = "noopener noreferrer";
                    link.target = "_blank";
                    link.click();
                  }, "Private download link created.")
                }
              >
                Download
              </Button>
            </div>
          ))}
      </div>
    </details>
  );
}

function Partnership({
  proposal: p,
  userId,
}: {
  proposal: Collaboration;
  userId: string;
}) {
  const state = useCollaborations();
  const owner = p.owner_id === userId;
  const principal = owner || p.proposer_id === userId;
  const contributor = state.data?.members.some(
    (m) =>
      m.proposal_id === p.id &&
      m.member_id === userId &&
      m.status === "Accepted" &&
      m.permission === "Contributor",
  );
  const open = ["Submitted", "Accepted"].includes(p.status);
  const milestones =
    state.data?.milestones.filter((m) => m.proposal_id === p.id) ?? [];
  const updates = (
    state.data?.updates.filter((u) => u.proposal_id === p.id) ?? []
  ).sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  );
  const events = (
    state.data?.events.filter((e) => e.proposal_id === p.id) ?? []
  ).sort(
    (a, b) =>
      a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id),
  );
  return (
    <article className="glass-panel space-y-6 rounded-3xl p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            {p.organization}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            {p.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Proposed by {p.proposer_name}
            {p.proposer_organization && ` · ${p.proposer_organization}`}
          </p>
        </div>
        <Tag positive={p.status === "Completed"}>{p.status}</Tag>
      </div>
      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer font-semibold">
          Proposal scope & expectations
        </summary>
        <dl className="mt-4 space-y-4">
          {[
            ["Objectives", p.objectives],
            ["Deliverables", p.deliverables],
            ["Timeline", p.timeline],
            ["Resources", p.resources],
            ["Confidentiality / IP expectations", p.terms],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm font-semibold">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <TeamPanel proposal={p} me={userId} />
      <ProjectFiles
        proposal={p}
        me={userId}
        canUpload={Boolean(
          (principal || contributor) &&
          p.status === "Accepted" &&
          !p.completion_requested_at,
        )}
      />
      {principal && p.status === "Submitted" && (
        <CollaborationForm
          action="decide_collaboration_proposal"
          args={{
            proposal: p.id,
            ...(!owner ? { decision: "Withdrawn" } : {}),
          }}
          label={owner ? "Record proposal decision" : "Withdraw proposal"}
          confirm="Record this decision? Proposal decisions are final in this workflow; discussions do not amend the saved proposal terms."
          fields={[
            ...(owner
              ? [
                  {
                    name: "decision",
                    label: "Decision",
                    type: "select" as const,
                    options: [
                      { value: "Accepted", label: "Accept partnership" },
                      { value: "Declined", label: "Decline proposal" },
                    ],
                  },
                ]
              : []),
            {
              name: "feedback",
              label: "Decision explanation",
              min: 10,
              max: 3000,
            },
          ]}
        />
      )}
      {p.status !== "Submitted" && (
        <div className="space-y-4">
          <h3 className="font-semibold">
            Delivery milestones ·{" "}
            {milestones.filter((m) => m.status === "Approved").length}/
            {milestones.length} approved
          </h3>
          {milestones.map((m) => (
            <div key={m.id} className="glass-row space-y-3 rounded-2xl p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <h4 className="font-semibold">{m.title}</h4>
                <Tag positive={m.status === "Approved"}>{m.status}</Tag>
              </div>
              <p className="whitespace-pre-wrap text-sm">{m.criteria}</p>
              <p className="text-xs text-muted-foreground">Due {m.due_on}</p>
              {m.feedback && (
                <p className="whitespace-pre-wrap text-sm">
                  Owner feedback: {m.feedback}
                </p>
              )}
              {owner && p.status === "Accepted" && (
                <details>
                  <summary className="cursor-pointer text-sm font-semibold">
                    Review delivery
                  </summary>
                  <div className="mt-3">
                    <CollaborationForm
                      action="review_collaboration_milestone"
                      args={{ milestone: m.id }}
                      label="Save review"
                      fields={[
                        {
                          name: "decision",
                          label: "Review status",
                          type: "select",
                          options: [
                            {
                              value: "Pending",
                              label: "Pending / corrections needed",
                            },
                            { value: "Approved", label: "Approved" },
                          ],
                        },
                        {
                          name: "feedback",
                          label: "Review feedback",
                          min: 10,
                          max: 3000,
                        },
                      ]}
                    />
                  </div>
                </details>
              )}
            </div>
          ))}
          {owner && p.status === "Accepted" && !p.completion_requested_at && (
            <details className="rounded-2xl border border-border p-4">
              <summary className="cursor-pointer font-semibold">
                Add milestone
              </summary>
              <div className="mt-4">
                <CollaborationForm
                  action="add_collaboration_milestone"
                  args={{ proposal: p.id }}
                  label="Add milestone"
                  fields={[
                    {
                      name: "title",
                      label: "Milestone title",
                      type: "text",
                      min: 4,
                      max: 160,
                    },
                    {
                      name: "criteria",
                      label: "Acceptance criteria",
                      min: 20,
                      max: 3000,
                    },
                    { name: "due", label: "Due date", type: "date" },
                  ]}
                />
              </div>
            </details>
          )}
        </div>
      )}
      <details
        className="rounded-2xl border border-border p-4"
        open={open || undefined}
      >
        <summary className="cursor-pointer font-semibold">
          Partner discussion & delivery evidence ({updates.length})
        </summary>
        <div className="mt-4 space-y-4">
          {open && principal && (
            <>
              <CollaborationForm
                action="post_collaboration_update"
                args={{ proposal: p.id }}
                label="Post update"
                fields={[
                  {
                    name: "message",
                    label: "Progress, question or delivery summary",
                    min: 10,
                    max: 4000,
                  },
                  {
                    name: "milestone",
                    label: "Related milestone",
                    type: "select",
                    optional: true,
                    options: [
                      { value: "", label: "General discussion" },
                      ...milestones.map((m) => ({
                        value: m.id,
                        label: m.title,
                      })),
                    ],
                  },
                  {
                    name: "evidence",
                    label: "Evidence link (HTTPS, optional for discussion)",
                    type: "url",
                    optional: true,
                    max: 2000,
                  },
                ]}
              />
              <p className="text-xs text-muted-foreground">
                Milestone approval requires the proposer to submit a linked
                evidence URL. External links use their host’s access rules—share
                only material you are authorized to disclose.
              </p>
            </>
          )}
          {updates.map((u) => (
            <div key={u.id} className="glass-row space-y-2 rounded-xl p-4">
              <p className="text-sm font-semibold">
                {u.author_name} · {new Date(u.created_at).toLocaleString()}
              </p>
              {u.milestone_id && (
                <p className="text-xs text-muted-foreground">
                  Milestone:{" "}
                  {milestones.find((m) => m.id === u.milestone_id)?.title}
                </p>
              )}
              <p className="whitespace-pre-wrap text-sm">{u.message}</p>
              {u.evidence_url && (
                <a
                  href={u.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold role-text"
                >
                  Open evidence ↗
                </a>
              )}
            </div>
          ))}
        </div>
      </details>
      {!principal &&
        contributor &&
        p.status === "Accepted" &&
        !p.completion_requested_at && (
          <CollaborationForm
            action="post_team_update"
            args={{ proposal: p.id }}
            label="Post team update"
            fields={[
              { name: "message", label: "Project update", min: 10, max: 4000 },
              {
                name: "evidence",
                label: "Optional evidence URL",
                type: "url",
                optional: true,
                max: 2000,
              },
            ]}
          />
        )}
      {principal && p.status === "Accepted" && (
        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="font-semibold">Completion review</h3>
          <p className="text-sm text-muted-foreground">
            {p.completion_requested_at
              ? "The proposer has requested completion. The owner must confirm or return it for further work."
              : "All milestones must be approved before the proposer requests completion. The owner then confirms the final outcome."}
          </p>
          {((!owner && !p.completion_requested_at) ||
            (owner && p.completion_requested_at)) && (
            <CollaborationForm
              action="finish_collaboration"
              args={{
                proposal: p.id,
                ...(!owner ? { decision: "Request" } : {}),
              }}
              label={
                owner ? "Record completion decision" : "Request completion"
              }
              confirm="Record this completion action? Confirmed completion makes the workspace read-only."
              fields={[
                ...(owner
                  ? [
                      {
                        name: "decision",
                        label: "Completion decision",
                        type: "select" as const,
                        options: [
                          { value: "Return", label: "Return for further work" },
                          { value: "Confirm", label: "Confirm completed" },
                        ],
                      },
                    ]
                  : []),
                {
                  name: "feedback",
                  label: "Completion summary or remaining work",
                  min: 10,
                  max: 3000,
                },
              ]}
            />
          )}
        </div>
      )}
      {p.completed_at && (
        <p className="text-sm">
          Completed {new Date(p.completed_at).toLocaleString()}. This records
          the two participants’ workflow confirmation, not independent
          verification of research outcomes or IP rights.
        </p>
      )}
      <details className="rounded-2xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          Decision history ({events.length})
        </summary>
        <ol className="mt-4 space-y-4">
          {events.map((e) => (
            <li key={e.id} className="border-l border-border pl-4">
              <p className="text-sm font-semibold">
                {e.title} · {e.actor_name}
              </p>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {e.detail}
              </p>
              <time className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
