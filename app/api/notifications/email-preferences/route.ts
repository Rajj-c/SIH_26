import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const { data, error } = await db
    .from("notification_email_preferences")
    .select("enabled")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    return NextResponse.json(
      { error: "Apply migration 022 and retry." },
      { status: 503 },
    );
  return NextResponse.json(
    {
      enabled: data?.enabled ?? false,
      configured: Boolean(
        process.env.RESEND_API_KEY &&
        process.env.RESEND_FROM_EMAIL &&
        process.env.NOTIFICATION_JOB_SECRET &&
        process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://"),
      ),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
