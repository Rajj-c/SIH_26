# Interview calendar downloads

No new migration or calendar account connection is required. Recruitment tracking now offers Download calendar event (.ics) for Scheduled interviews on Shortlisted or Interview Scheduled applications. Authorized students, employers and institution viewers use the same existing interview/application RLS boundaries. An internship supervisor does not gain recruitment access through calendar export.

The authenticated GET endpoint at `/api/recruitment/interviews/[id]/calendar` re-fetches the interview, application and opportunity using the session-scoped Supabase client. Cancelled or no-longer-active application stages are rejected. Missing/inaccessible records share an unavailable response. Database errors remain generic. The response is a private, no-store attachment with a fixed UUID-based filename.

The file includes saved role/company, start/end time, location or meeting link, instructions, applicant response and an application reference. No attendee emails, organizer, attached documents or private response notes are added. Recruiters can use the application reference to distinguish interviews without adding candidate names to the export. The button asks confirmation before downloading because meeting details can be sensitive. CLASS:PRIVATE is a calendar hint, not access control after download: use a trusted calendar.

Times use UTC, so importing software can display its configured local zone. Text values escape newlines, backslashes, commas and semicolons; CRLF lines fold at no more than 75 UTF-8 octets without splitting characters. IDs are validated before interpolation. One VEVENT is generated with a stable interview-based UID. STATUS:TENTATIVE deliberately does not claim applicant acceptance. There is no scheduling METHOD, attendee or organizer; this is not an invitation.

Calendar copies do not synchronize. Rescheduling currently creates a new interview ID, so users must remove the old imported event manually. Cancellation does not remove downloads. Repeated import behavior depends on the calendar client; stable UID does not guarantee deduplication in every app. Calendar editing does not respond to or change the platform interview. No external API request, notification, reminder automation or database write is performed by export.

Reference: [iCalendar RFC 5545](https://www.rfc-editor.org/rfc/rfc5545).

Tests cover UTC conversion, duration, Unicode folding, injection escaping, invalid data, auth/missing records, cancellation/status checks, scoped lookups and response headers. Route tests mock the session client; existing recruitment database tests cover RLS. Live authenticated downloads/imports, browser/mobile behavior and actual calendar-client compatibility remain to be checked.
