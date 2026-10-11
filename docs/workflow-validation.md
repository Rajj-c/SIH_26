# Connected workflow validation — 7 October 2026

## Changes in this pass

Fixed client-cache cleanup on sign-out and account changes. The previous fixed
lists missed filtered/paginated notifications, the question bank and (on explicit
logout) several newer modules. Stale results could remain in the shared browser
cache after switching accounts even though database policies still protected
fresh requests.

Both cleanup paths now use one namespace-based predicate. Question-bank data
uses the same `/api/` cache namespace as other workspaces; the legacy key is
also cleared. Logout clears data without refetching; an identity change clears
and revalidates; same-account token refresh does not clear the workspace.

Added executable regression tests for these behaviors and middleware routing:
all 16 assigned/requested role combinations, signed-out redirects, refreshed
cookies on redirects, missing/invalid/unavailable role lookups, and login routing.

## Automated coverage

`npm test` runs disposable local PostgreSQL fixtures and route/logic harnesses.
It does not create users or records in the connected Supabase project.

- Assessment evidence and assessment-gated applications; server-owned scores.
- Interview scheduling/rescheduling, private offers, applicant responses and
  two-party joining confirmation.
- Internship acceptance, milestones, progress logs, supervision, private report
  versions, reviewed completion and certificate lifecycle.
- Learning publication, enrollment capacity, submissions, publisher review,
  workshop audience/access, attendance and feedback.
- Institution membership scopes, collaboration consent, contributor restrictions,
  revocation and private storage-object policies.
- Notification recipient privacy, pagination and optional email-worker guards.
- Dashboard analytics and unauthorized records excluded from calculations.

## Browser evidence and limitations

The local landing page and login screen rendered. Direct signed-out navigation
to `/student` redirected to `/login?next=%2Fstudent`.

No signed-in browser session was available at the start of this pass. Complete
UI journeys, responsive layouts inside all four portals, real file transfers,
deployed migration parity, Gemini responses and external email delivery remain
unverified. A passing local fixture is not proof of deployed Supabase behavior.
No live database changes or external messages were made during this pass.

## Next signed-in acceptance pass

Use designated demo accounts and clearly labelled QA records only. Do not alter
real applicants, decisions or credentials for testing.

1. Student assessment → application → industry interview/offer → applicant
   response. Verify both portals show saved state after reload. Joining remains
   date-gated and requires both parties; do not backdate live records.
2. Internship offer → acceptance → log/report → authorized mentor review →
   completion. Check unauthorized accounts cannot read the report.
3. Published learning program → enrollment → work submission → publisher review.
   Registration alone must not display as completion or verified proficiency.
4. Academician supervision and research proposal → counterpart consent →
   authorized institution visibility. Check revoked access disappears.
5. Switch accounts in the same browser and inspect notifications, question bank,
   credentials and learning pages for stale data. Test mobile navigation, keyboard
   focus, empty states and retry controls in each portal.

Actual upload/download testing requires a designated harmless file and a demo
record. Notification delivery requires an opted-in demo recipient and configured
provider/worker; it is not enabled by these changes.
