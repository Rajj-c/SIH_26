# Connected-platform expansion: rollout and remaining work

## Implemented in this increment

- Supabase-published learning tracks, author-entered modules/topics/resources, publisher identity, explicit archive, authenticated practice lookups, and honest empty states. The old bundled catalog is no longer imported by application code. Existing progress/reports remain saved; retired bundled course URLs no longer start new practice. Topic/level reference lists remain curated reference data, not fictional user records.
- Organization identity requests, manually provisioned independent platform reviewers, approval/rejection/revocation, immutable decision history, a minimal verification directory and identity labels on learning-track cards. Approval attests only the submitted legal-name snapshot, not later profile edits, course accreditation or recruitment legitimacy.
- Shared database-backed Gemini allowance: one request per minute and 30 per UTC day per account across practice, assessment drafting, match advice and learning plans. Requests consume allowance before external generation, including failures. Provider project quotas still need configuring; this is not a global spending cap.
- Project-team invitations requiring consent from both original partnership principals and the invitee. Accepted contributors can post project updates and upload PDFs; observers can read. Principals retain delivery and completion approval. Revocation stops future database/storage access, but cannot recall downloads or already-issued 60-second signed URLs.
- Private project PDF attachments, maximum 10 MB, no public bucket. File type restrictions and access controls are not malware scanning; upload trusted documents only. Downloads are user-initiated. Registered file records are immutable; failed-upload cleanup cannot delete registered attachments.
- Innovation challenge publishing, fixed criteria, one private immutable submission per learner, capacity/deadline checks and organizer scoring after deadline. Scores are not skill evidence. No automated prizes, public rankings, team challenge submissions or multiple independent judges are claimed.
- Ongoing mentorship calls, goal-based requests, organizer acceptance, append-only progress/feedback, learner-requested and organizer-confirmed completion. This is separate from internship supervision and does not issue a credential. Session scheduling remains in Sessions & Events; automatic appointment linking is not included.
- Institution email-only CSV imports with preview, validation, case-normalized deduplication and explicit confirmation. Imports create invitations, not accounts or memberships. Only the account with the invited Auth email can accept; acceptance creates an approved membership with the existing institution oversight permissions. Revoking an unaccepted invitation is supported. Revoking accepted membership uses the existing institution membership workflow. Imports do not automatically send invitation emails.
- Outcome Explorer for industry/institution: date/department/year filters, monthly submission/completion/joining events, canonical skill demand from real platform hiring opportunities, source IDs, definitions and aggregate JSON export with small counts withheld. Reports use current authorized cohort membership, not historical membership snapshots. Skill requirements are current values grouped by publication date, not a historical skill-demand archive. Aggregate exports are not guaranteed anonymous; no public policymaker data endpoint is exposed.
- Opt-in daily notification email preferences and a service-only leased delivery queue. A secret-protected worker sends generic messages through the project's existing Resend setup; it never includes scores, meeting links, certificates or offer details. Upcoming registered sessions create deduplicated in-app reminders when the worker runs. Calendar `.ics` exports remain snapshots, not synchronization.

No production sample accounts, courses, opportunities or metrics were inserted. Tests use disposable local databases and mock external providers only.

## Apply migrations

After migrations through 015, run these in order, once each in Supabase SQL Editor:

1. `202609220016_published_learning_tracks.sql`
2. `202609220017_organization_verification.sql`
3. `202609220018_shared_ai_limits.sql`
4. `202609220019_collaboration_teams.sql`
5. `202609220020_challenges_mentorship.sql`
6. `202609220021_roster_invitations.sql`
7. `202609220022_notification_delivery.sql`

Until these are applied, affected screens report unavailable data rather than manufacturing records. Existing AI routes require 018 and fail closed if the allowance store cannot be read.

## Reviewer setup: explicit trusted account required

Create/sign in to the intended reviewer account normally first. In Supabase SQL Editor, look up that account in Auth/Profiles and explicitly insert its actual UUID into `private.platform_reviewers(user_id)`. Never give the browser a service-role key and never use signup metadata or an email domain to grant this permission. No account is promoted automatically. Reviewer UI is available at `/<the-account-role>/organization`.

The exact reviewer account has not been chosen or provisioned by this implementation. A reviewer cannot approve their own request; use an independent trusted reviewer. Delete the explicit allowlist row to revoke reviewer access. This is platform identity review, not legal verification or official accreditation.

## Optional delivery activation

Configure server-only `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, a cryptographically random `NOTIFICATION_JOB_SECRET` of at least 32 characters, and the production HTTPS `NEXT_PUBLIC_APP_URL`. Existing Supabase server credentials are required. Do not paste secrets into chat or commit them.

Configure your hosting scheduler to POST to `/api/jobs/notification-delivery` with `Authorization: Bearer <NOTIFICATION_JOB_SECRET>` every 5 minutes. This repository does not register an external scheduler. The worker claims at most five emails per run, with a five-minute lease, at most three attempts, and a 23-hour retry lifetime. Increase throughput only after checking provider quotas. Opt-out and account email changes prevent subsequent claims; a message already in flight cannot be recalled. A job acknowledged by Resend is not proof of delivery to an inbox.

Stored message payloads and provider idempotency keys remain identical on retries. Resend documents a 24-hour key lifetime: <https://resend.com/docs/dashboard/emails/idempotency-keys>. Retries stop before that lifetime. In-memory or cron retries must never bypass this queue. Monitor expired/exhausted jobs and delivery-provider bounces; automatic bounce handling and retention cleanup are not included.

No real emails were sent during implementation. Configure the scheduler and test with an explicitly opted-in real account before claiming reminders are live. Session reminders currently run inside the configured delivery worker; if it is disabled, those scheduled reminders do not run either.

## Still outstanding — do not describe the entire backlog as complete

1. **Organization-wide staff delegation:** Project teams are implemented, but shared recruiter/placement-officer/trainer permissions across hiring and every organization-owned resource are not. Existing recruitment remains account-owner scoped. This needs an organization resource-ownership model and explicit consent before expanding candidate/document access.
2. **External learning/certification/institution database integrations:** No provider has been selected/authorized. Stored resource links and CSV invitations are not provider completion sync, issuer verification or institutional database sync. Implement against the selected provider's actual supported API and sandbox credentials, not invented endpoints.
3. **Calendar synchronization:** No Google/Microsoft OAuth connection or meeting creation is configured. Keep using `.ics` export until the target provider and OAuth app are connected.
4. **Richer historical/effectiveness analytics:** No historical membership snapshots, archived requirement versions or causal learning-to-score improvement claims. Comparable reassessment requires a defined assessment/version policy before scores should be compared.
5. **Production validation and operations:** Run the live checks below after migration. Shared AI limits and privacy tests are implemented, but load testing, monitoring/alerts, backup restore rehearsal, malware scanning, email bounce/retention policies and independent AI-content evaluation remain operational work.

## Live acceptance checklist

Use actual consented accounts in all four roles; do not put fixtures in the production database.

- Publish a real learning track; discover it as student; practise a topic; verify saved report/progress; archive and confirm new practice is blocked while history remains.
- Submit organization evidence; check an unrelated account cannot read it; independently review; revoke and confirm badge refresh. Test an allowlisted requester cannot self-approve.
- Invite a project contributor; verify neither invitation nor one partner approval grants access; accept after both approve; upload PDF; revoke and verify fresh reads/download requests are blocked. Test observer write denial.
- Submit a challenge entry; confirm private isolation and judging deadline; review only after deadline. For mentorship, accept → progress → request completion → confirm.
- Preview a roster with duplicates and an invalid row; confirm invalid imports save nothing; import valid addresses; accept using the matching account and verify approved membership. Verify an unrelated account cannot see the invite.
- Compare Outcome Explorer counts against actual underlying records and UTC dates, including empty cohorts and one-sided joining confirmations.
- Opt in to daily emails with a controlled account; run the worker through the configured scheduler; check delivery and retry behavior without exposing message content in logs; opt out.
- Test the original application → interview → offer → joining and internship → report → review → certificate journeys for regression.
- Check mobile widths, keyboard navigation, focus states, long text, loading/errors and reduced-motion preferences in an authenticated browser.

Local tests validate contracts and PostgreSQL/RLS behavior; they do not establish live Supabase configuration, browser usability, provider delivery or production scalability.
