"use client";
import { useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuestionBank } from "@/lib/question-bank";
import { supabase } from "@/lib/supabase/client";
import { usePlatformData, type Role } from "@/lib/platform-store";
import { DataState, Empty, PageHeading, Tag, useAction } from "./primitives";
export function QuestionBank({ role }: { role: Role }) {
  const bank = useQuestionBank();
  const platform = usePlatformData();
  const action = useAction();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const items =
    bank.data?.items.filter(
      (b) =>
        (status === "All" || status === b.status) &&
        `${b.question.skillArea} ${b.question.question}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    ) ?? [];
  return (
    <DashboardShell role={role} title="Reviewed question bank">
      <div className="mx-auto max-w-5xl space-y-6">
        <PageHeading
          eyebrow="Independent quality review"
          title="Questions worth asking."
          description="Private, immutable question snapshots. Authors submit saved assessments from the studio; provisioned subject reviewers check accuracy, relevance, fairness and answer explanations. Approval is not accreditation."
        />
        <DataState {...bank} retry={bank.refresh} />
        {action.feedback}
        <div className="flex flex-wrap gap-3">
          <input
            className="field"
            aria-label="Search questions"
            placeholder="Search by skill or question"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="field"
            aria-label="Review status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["All", "Pending", "Approved", "Rejected", "Revoked"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground">
          Latest 500 accessible items. Answer keys are shared only with their
          author and explicitly provisioned subject reviewers. Correct rejected
          items in the studio and submit a new snapshot.
        </p>
        {items.map((b) => (
          <Card key={b.id}>
            <CardContent className="space-y-4 p-6">
              <div className="flex gap-2">
                <Tag positive={b.status === "Approved"}>{b.status}</Tag>
                <Tag>{b.question.skillArea}</Tag>
                <Tag>{b.question.category}</Tag>
              </div>
              <h2 className="font-semibold whitespace-pre-wrap">
                {b.question.question}
              </h2>
              <ol className="grid gap-2 sm:grid-cols-2">
                {b.question.options.map((o, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-border p-3 text-sm"
                  >
                    {String.fromCharCode(65 + i)}. {o}
                    {i === b.question.correctAnswer && (
                      <span className="block role-text">Answer key</span>
                    )}
                  </li>
                ))}
              </ol>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {b.question.explanation}
              </p>
              <details>
                <summary className="cursor-pointer text-sm">
                  Review history
                </summary>
                {b.history.map((e) => (
                  <p className="mt-2 text-xs text-muted-foreground" key={e.id}>
                    {e.decision} · {new Date(e.created_at).toLocaleString()} ·{" "}
                    {e.reason}
                  </p>
                ))}
              </details>
              {bank.data?.reviewer &&
                b.owner_id !== platform.data?.profile.id &&
                ["Pending", "Approved"].includes(b.status) && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <label className="block text-sm">
                      Review rationale
                      <textarea
                        className="field mt-2"
                        minLength={20}
                        maxLength={2000}
                        value={reasons[b.id] || ""}
                        onChange={(e) =>
                          setReasons({ ...reasons, [b.id]: e.target.value })
                        }
                        placeholder="Explain your independent solution, answer-key check, distractor quality, relevance and fairness checks."
                      />
                    </label>
                    <div className="flex gap-3">
                      {(b.status === "Pending"
                        ? ["Approved", "Rejected"]
                        : ["Revoked"]
                      ).map((decision) => (
                        <Button
                          key={decision}
                          disabled={
                            action.busy ||
                            (reasons[b.id]?.trim().length || 0) < 20
                          }
                          variant="outline"
                          onClick={() =>
                            action.run(async () => {
                              const { error } = await supabase.rpc(
                                "review_bank_question",
                                {
                                  item: b.id,
                                  decision,
                                  review_reason: reasons[b.id],
                                },
                              );
                              if (error) throw new Error(error.message);
                              await bank.refresh();
                            }, "Review recorded.")
                          }
                        >
                          {decision === "Approved"
                            ? "Approve question"
                            : decision === "Rejected"
                              ? "Request correction"
                              : "Revoke approval"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
            </CardContent>
          </Card>
        ))}
        {!bank.loading && !bank.error && !items.length && (
          <Empty
            title="No matching questions"
            description="Save an assessment draft, then submit its questions for independent review. Reviewer access must be provisioned by the database administrator."
          />
        )}
      </div>
    </DashboardShell>
  );
}
