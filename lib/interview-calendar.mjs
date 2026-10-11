const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isCalendarId = (value) =>
  typeof value === "string" && uuid.test(value);
// RFC 5545 TEXT escaping prevents user-entered text becoming calendar properties.
export function calendarText(value) {
  return String(value ?? "")
    .replace(/\r\n|\r/g, "\n")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}
export function foldCalendarLine(line) {
  const encoder = new TextEncoder();
  let result = "",
    part = "",
    bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      result += part + "\r\n";
      part = " ";
      bytes = 1;
    }
    part += char;
    bytes += size;
  }
  return result + part;
}
function timestamp(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()))
    throw new Error("Invalid calendar date");
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}
/** Personal snapshot, not an invitation or synchronized calendar feed. @param {any} input */
export function interviewCalendar({
  interview,
  opportunity,
  now = new Date().toISOString(),
}) {
  if (
    !isCalendarId(interview.id) ||
    !isCalendarId(interview.application_id) ||
    interview.status !== "Scheduled" ||
    !Number.isInteger(interview.duration_minutes) ||
    interview.duration_minutes < 15 ||
    interview.duration_minutes > 480
  )
    throw new Error("Interview cannot be exported");
  const start = new Date(interview.starts_at).getTime();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Origin Point//Interview Calendar//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:interview-${interview.id}@origin-point`,
    `DTSTAMP:${timestamp(now)}`,
    `DTSTART:${timestamp(start)}`,
    `DTEND:${timestamp(start + interview.duration_minutes * 60000)}`,
    "CLASS:PRIVATE",
    "STATUS:TENTATIVE",
    `SUMMARY:${calendarText("Interview: " + opportunity.title + " · " + opportunity.company)}`,
    `LOCATION:${calendarText(interview.location)}`,
    `DESCRIPTION:${calendarText(`Mode: ${interview.mode}\nApplicant response: ${interview.response}\n${interview.instructions}\nApplication reference: ${interview.application_id}\nDownloaded snapshot only. Check Origin Point for the latest schedule. Calendar changes do not respond to, cancel or reschedule the interview. Replace or remove this event manually if the schedule changes.`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldCalendarLine).join("\r\n") + "\r\n";
}

/** @param {any} session @param {string} location */
export function sessionCalendar(
  session,
  location,
  now = new Date().toISOString(),
) {
  if (
    !isCalendarId(session.id) ||
    session.status !== "Scheduled" ||
    new Date(session.ends_at) <= new Date(session.starts_at)
  )
    throw new Error("Session is not scheduled");
  return (
    [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Origin Point//Learning Sessions//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:session-${session.id}@origin-point`,
      `DTSTAMP:${timestamp(now)}`,
      `DTSTART:${timestamp(session.starts_at)}`,
      `DTEND:${timestamp(session.ends_at)}`,
      "CLASS:PRIVATE",
      "STATUS:TENTATIVE",
      `SUMMARY:${calendarText(session.title)}`,
      `LOCATION:${calendarText(location)}`,
      `DESCRIPTION:${calendarText(`${session.kind} · Speaker: ${session.speaker}\n${session.agenda}\nSnapshot only. Check Origin Point for current status. Importing does not register attendance or synchronize cancellations.`)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]
      .map(foldCalendarLine)
      .join("\r\n") + "\r\n"
  );
}
