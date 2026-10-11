import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseNotificationQuery,
  notificationPage,
  NOTIFICATION_PAGE_SIZE,
} from "@/lib/notification-pagination.mjs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  let filters;
  try {
    filters = parseNotificationQuery(request.url);
  } catch {
    return NextResponse.json(
      {
        error:
          "Invalid notification filters. Return to the newest updates and try again.",
      },
      { status: 400 },
    );
  }
  let query = db
    .from("notifications")
    .select("id,category,title,href,created_at,read_at")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(NOTIFICATION_PAGE_SIZE + 1);
  if (filters.unreadOnly) query = query.is("read_at", null);
  if (filters.cursor) {
    const { created_at, id } = filters.cursor;
    query = query.or(
      `created_at.lt.${created_at},and(created_at.eq.${created_at},id.lt.${id})`,
    );
  }
  const [items, unread] = await Promise.all([
    query,
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null),
  ]);
  if (items.error || unread.error)
    return NextResponse.json(
      {
        error:
          "Notifications are unavailable. Apply migration 202609220010_notifications.sql if needed, then retry.",
      },
      { status: 503 },
    );
  return NextResponse.json(
    { ...notificationPage(items.data ?? []), unread: unread.count ?? 0 },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
