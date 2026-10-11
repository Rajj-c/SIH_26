"use client";
import Link from "next/link";
import { useState } from "react";
import { EmailPreferences } from "./email-preferences";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { Button } from "@/components/ui/button";
import { useNotifications, markNotificationsRead } from "@/lib/notifications";
import { DataState, Empty, PageHeading, Tag, useAction } from "./primitives";
export function NotificationsWorkspace({ role }: { role: string }) {
  const action = useAction();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const state = useNotifications({
    unreadOnly,
    cursor: cursors[cursors.length - 1],
  });
  const items = state.data?.items ?? [];
  return (
    <DashboardShell role={role} title="Notifications">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeading
          eyebrow="Your workspace inbox"
          title="Know what needs your attention."
          description="Real updates from your applications, internships, learning programs and institution. Notifications begin when this feature is activated; earlier activity is not reconstructed."
        />
        <DataState {...state} retry={state.refresh} />
        <EmailPreferences />
        {action.feedback}
        {state.data && !state.error && (
          <>
            <div className="glass-panel flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
              <div>
                <p className="font-semibold">
                  {state.data.unread} unread updates
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Page {cursors.length} · up to 100{" "}
                  {unreadOnly ? "unread" : "saved"} updates per page. Unread
                  count covers your entire inbox. Updates refresh every 30
                  seconds.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  aria-pressed={unreadOnly}
                  onClick={() => {
                    setUnreadOnly(!unreadOnly);
                    setCursors([null]);
                  }}
                >
                  {unreadOnly ? "Show all updates" : "Unread only"}
                </Button>
                <Button
                  variant="outline"
                  disabled={action.busy || !state.data.unread}
                  onClick={() =>
                    action.run(
                      () => markNotificationsRead(),
                      "All notifications marked read.",
                    )
                  }
                >
                  Mark all read
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {items.map((n) => (
                <article
                  key={n.id}
                  className={`glass-panel rounded-2xl border p-5 ${n.read_at ? "border-border" : "border-primary/30"}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <Tag positive={!n.read_at}>
                      {n.category}
                      {!n.read_at ? " · Unread" : ""}
                    </Tag>
                    <time
                      className="text-xs text-muted-foreground"
                      dateTime={n.created_at}
                    >
                      {new Date(n.created_at).toLocaleString()}
                    </time>
                  </div>
                  <h2 className="mt-3 font-semibold">{n.title}</h2>
                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <Link
                      href={n.href}
                      className="text-sm font-semibold role-text"
                    >
                      Open related workspace →
                    </Link>
                    {!n.read_at && (
                      <Button
                        variant="ghost"
                        disabled={action.busy}
                        onClick={() =>
                          action.run(
                            () => markNotificationsRead(n.id),
                            "Marked as read.",
                          )
                        }
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
            {!items.length && (
              <Empty
                title={
                  unreadOnly
                    ? "No unread updates on this page"
                    : "No notifications on this page"
                }
                description="Updates appear when another account takes a relevant action. You will not receive notifications for your own actions."
              />
            )}
            <nav
              aria-label="Notification pages"
              className="glass-panel flex flex-wrap items-center gap-3 rounded-2xl p-4"
            >
              <Button
                variant="outline"
                disabled={cursors.length === 1 || state.loading || action.busy}
                onClick={() => setCursors((current) => current.slice(0, -1))}
              >
                Previous page
              </Button>
              <Button
                variant="outline"
                disabled={
                  !state.data.nextCursor || state.loading || action.busy
                }
                onClick={() => {
                  if (state.data?.nextCursor)
                    setCursors((current) => [
                      ...current,
                      state.data!.nextCursor,
                    ]);
                }}
              >
                Older updates
              </Button>
              <Button
                variant="ghost"
                disabled={state.loading || action.busy}
                onClick={() => {
                  setCursors([null]);
                  void state.refresh();
                }}
              >
                Newest updates
              </Button>
              <p className="text-xs text-muted-foreground" role="status">
                {items.length} updates on page {cursors.length}
              </p>
            </nav>
            <p className="text-xs text-muted-foreground">
              Opening a workspace does not mark a notification read. Access to
              the underlying record is checked separately and may have changed.
              Email updates require opt-in and a configured delivery worker. SMS
              and push notifications are not enabled.
            </p>
          </>
        )}
      </div>
    </DashboardShell>
  );
}
