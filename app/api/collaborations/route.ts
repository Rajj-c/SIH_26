import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    async function rows(table: string) {
      const result = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db
          .from(table)
          .select("*")
          .order("id")
          .range(offset, offset + 499);
        if (error) throw error;
        result.push(...data);
        if (data.length < 500) return result;
      }
    }
    const [proposals, milestones, updates, events, members, files] =
      await Promise.all([
        rows("collaboration_proposals"),
        rows("collaboration_milestones"),
        rows("collaboration_updates"),
        rows("collaboration_events"),
        rows("collaboration_members"),
        rows("collaboration_files"),
      ]);
    return NextResponse.json(
      { proposals, milestones, updates, events, members, files },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      {
        error:
          "Collaboration workspaces could not load. Apply migrations through 202609220019_collaboration_teams.sql if needed, then retry.",
      },
      { status: 503 },
    );
  }
}
