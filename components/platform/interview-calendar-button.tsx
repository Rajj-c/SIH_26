"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
export function InterviewCalendarButton({
  interviewId,
}: {
  interviewId: string;
}) {
  return <CalendarDownloadButton id={interviewId} kind="interview" />;
}
export function CalendarDownloadButton({
  id,
  kind,
}: {
  id: string;
  kind: "interview" | "session";
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              "Download a private calendar copy containing the meeting location/link and instructions? Import only into a calendar you trust. This does not send invitations or synchronize future changes.",
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            const response = await fetch(
              kind === "interview"
                ? `/api/recruitment/interviews/${encodeURIComponent(id)}/calendar`
                : `/api/learning-sessions/${encodeURIComponent(id)}/calendar`,
              { cache: "no-store" },
            );
            if (!response.ok) {
              const body = await response.json();
              throw new Error(body.error || "Calendar export failed.");
            }
            const url = URL.createObjectURL(await response.blob());
            const anchor = document.createElement("a");
            anchor.href = url;
            anchor.download = `${kind}-${id}.ics`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
          } catch (e) {
            setError(
              e instanceof Error ? e.message : "Calendar export failed.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <CalendarDays className="mr-2 h-4 w-4" />
        {busy ? "Preparing calendar file…" : "Download calendar event (.ics)"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Import into your calendar. This is a snapshot, not a live subscription:
        manually remove old events after cancellation or rescheduling. Importing
        does not register you or confirm participation.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
