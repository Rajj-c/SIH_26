import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { interviewCalendar, isCalendarId } from "@/lib/interview-calendar.mjs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};
const error = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status, headers });
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const db = await createClient();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return error("Please sign in.", 401);
    const { id } = await params;
    if (!isCalendarId(id)) return error("Interview unavailable.", 404);
    const { data: i, error: interviewError } = await db
      .from("application_interviews")
      .select(
        "id,application_id,starts_at,duration_minutes,mode,location,instructions,status,response",
      )
      .eq("id", id)
      .maybeSingle();
    if (interviewError)
      return error("Could not load interview details. Please retry.", 503);
    if (!i) return error("Interview unavailable.", 404);
    const { data: a, error: applicationError } = await db
      .from("applications")
      .select("opportunity_id,status")
      .eq("id", i.application_id)
      .maybeSingle();
    if (applicationError)
      return error("Could not load application details. Please retry.", 503);
    if (!a) return error("Interview unavailable.", 404);
    if (
      i.status !== "Scheduled" ||
      !["Shortlisted", "Interview Scheduled"].includes(a.status)
    )
      return error(
        "This interview is no longer active. Check recruitment tracking and remove any old calendar copy.",
        409,
      );
    const { data: o, error: opportunityError } = await db
      .from("opportunities")
      .select("title,company")
      .eq("id", a.opportunity_id)
      .maybeSingle();
    if (opportunityError)
      return error("Could not load opportunity details. Please retry.", 503);
    if (!o) return error("Interview unavailable.", 404);
    return new Response(interviewCalendar({ interview: i, opportunity: o }), {
      headers: {
        ...headers,
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="interview-${id}.ics"`,
      },
    });
  } catch {
    return error("Calendar export could not complete. Please retry.", 503);
  }
}
