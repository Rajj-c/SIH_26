import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isCalendarId, sessionCalendar } from "@/lib/interview-calendar.mjs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const failure = (error: string, status: number) =>
  NextResponse.json({ error }, { status, headers });
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return failure("Please sign in.", 401);
    const { id } = await params;
    if (!isCalendarId(id)) return failure("Session unavailable.", 404);
    const { data: s, error } = await db
      .from("learning_sessions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return failure("Could not load session.", 503);
    if (!s) return failure("Session unavailable.", 404);
    if (s.status !== "Scheduled")
      return failure(
        "This session is no longer scheduled. Remove any old calendar copy manually.",
        409,
      );
    const { data: access, error: accessError } = await db
      .from("learning_session_access")
      .select("location")
      .eq("session_id", id)
      .maybeSingle();
    if (accessError) return failure("Could not load meeting details.", 503);
    if (!access)
      return failure(
        "Register for the session to download its calendar event.",
        403,
      );
    return new Response(sessionCalendar(s, access.location), {
      headers: {
        ...headers,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="session-${id}.ics"`,
      },
    });
  } catch {
    return failure("Calendar export unavailable.", 503);
  }
}
