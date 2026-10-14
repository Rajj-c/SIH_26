"use client";
import { useState } from "react";
import useSWR, { mutate } from "swr";
import { supabase } from "@/lib/supabase/client";
import { parseRosterCSV } from "@/lib/roster-import.mjs";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { type Role } from "@/lib/platform-store";
import {
  PageHeading,
  DataState,
  Empty,
  Field,
  Tag,
  useAction,
} from "./primitives";
const KEY = "/api/roster-invitations";
export function RosterInvitations({ role, embedded = false }: { role: Role; embedded?: boolean }) {
  const s = useSWR(
    KEY,
    async () => {
      const all: any[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("roster_invitations")
          .select("*")
          .order("id")
          .range(offset, offset + 499);
        if (error)
          throw new Error(
            "Roster invitations unavailable. Apply migration 021 and retry.",
          );
        all.push(...data);
        if (data.length < 500) return all;
      }
    },
    { refreshInterval: 30000, shouldRetryOnError: false },
  );
  const action = useAction(),
    [preview, setPreview] = useState<{
      emails: string[];
      duplicates: number;
    } | null>(null);
  return (
    <DashboardShell embedded={embedded} role={role} title="Roster invitations">
      <div className="space-y-6">
        <PageHeading
          eyebrow="Institution connections"
          title={
            role === "institution"
              ? "Invite your academic community."
              : "Choose your institution connections."
          }
          description="Roster imports create invitations only. Accepting creates an approved institution membership and grants that institution the existing member oversight permissions, including skills, applications and learning records."
        />
        <DataState
          loading={s.isLoading}
          error={s.error?.message}
          retry={s.mutate}
        />
        {action.feedback}
        {role === "institution" && (
          <section className="glass-panel rounded-3xl p-6 space-y-4">
            <Field label="Upload an email-only CSV (header: email), maximum 200 rows">
              <input
                type="file"
                accept=".csv,text/csv"
                className="field"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setPreview(null);
                  if (file)
                    void action.run(async () => {
                      if (file.size > 100000)
                        throw new Error("CSV must be smaller than 100 KB.");
                      setPreview(parseRosterCSV(await file.text()));
                    }, "Preview ready. No invitations have been saved yet.");
                }}
              />
            </Field>
            {preview && (
              <>
                <p className="text-sm">
                  {preview.emails.length} unique invitations ·{" "}
                  {preview.duplicates} duplicate rows removed
                </p>
                <div className="max-h-52 overflow-auto rounded-xl border p-3 text-sm">
                  {preview.emails.map((email) => (
                    <p key={email}>{email}</p>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Existing invites are skipped. This does not send email, create
                  accounts, verify identities or import academic records.
                </p>
                <Button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const { data, error } = await supabase.rpc(
                        "import_roster_invitations",
                        { emails: preview.emails },
                      );
                      if (error) throw error;
                      await mutate(KEY);
                      setPreview(null);
                      return data;
                    }, "Invitations saved. Existing invitations were left unchanged.")
                  }
                >
                  Confirm roster invitations
                </Button>
              </>
            )}
          </section>
        )}
        {!s.isLoading && !s.error && !s.data?.length && (
          <Empty
            title="No invitations yet"
            description="Invitations for the email on your signed-in account appear here."
          />
        )}
        {s.data?.map((r) => (
          <article key={r.id} className="glass-panel rounded-3xl p-5 space-y-3">
            <Tag>{r.status}</Tag>
            <h2 className="font-semibold">{r.institution_name}</h2>
            <p className="text-sm text-muted-foreground">
              {r.email} · {new Date(r.created_at).toLocaleDateString()}
            </p>
            {r.status === "Invited" && (
              <div className="flex gap-2">
                {(role === "institution"
                  ? ["Revoke"]
                  : ["Accept", "Decline"]
                ).map((decision) => (
                  <Button
                    key={decision}
                    variant="outline"
                    disabled={action.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          decision === "Accept"
                            ? "Approve institution membership and share your member records with this institution?"
                            : `${decision} this invitation?`,
                        )
                      )
                        void action.run(async () => {
                          const { error } = await supabase.rpc(
                            "respond_roster_invitation",
                            { invitation: r.id, decision },
                          );
                          if (error) throw error;
                          await mutate(KEY);
                          await mutate("/api/platform");
                        }, "Invitation updated.");
                    }}
                  >
                    {decision}
                  </Button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}
