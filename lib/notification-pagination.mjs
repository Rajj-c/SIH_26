export const NOTIFICATION_PAGE_SIZE = 100;

export function parseNotificationQuery(url) {
  const params = new URL(url).searchParams;
  const unread = params.get("unread");
  if (unread !== null && unread !== "true" && unread !== "false")
    throw new Error("Invalid unread filter.");
  const raw = params.get("cursor");
  let cursor = null;
  if (raw !== null) {
    if (raw.length > 300) throw new Error("Invalid notification cursor.");
    try {
      cursor = JSON.parse(raw);
    } catch {
      throw new Error("Invalid notification cursor.");
    }
    if (
      !cursor ||
      typeof cursor !== "object" ||
      typeof cursor.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cursor.id,
      ) ||
      typeof cursor.created_at !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(
        cursor.created_at,
      ) ||
      !Number.isFinite(Date.parse(cursor.created_at))
    )
      throw new Error("Invalid notification cursor.");
  }
  return { unreadOnly: unread === "true", cursor };
}

export function notificationPage(rows) {
  const items = rows.slice(0, NOTIFICATION_PAGE_SIZE);
  const last = items.at(-1);
  return {
    items,
    // Preserve PostgreSQL microseconds: Date.toISOString would lose precision.
    nextCursor:
      rows.length > NOTIFICATION_PAGE_SIZE && last
        ? JSON.stringify({ created_at: last.created_at, id: last.id })
        : null,
  };
}
