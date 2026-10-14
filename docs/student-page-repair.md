# Student page audit and database repair

Checked on 13 October 2026 in the signed-in local app against the configured Supabase project `eoamvpadxeptypompcja`.

## Confirmed failures

| Student page | Missing database objects | Existing migration |
| --- | --- | --- |
| Institution Invitations | `roster_invitations` | `202609220021_roster_invitations.sql` |
| Challenges & Mentorship | `initiatives`, `initiative_entries`, `initiative_journal` | `202609220020_challenges_mentorship.sql` |
| Project Teams | `collaboration_members`, `collaboration_files` | `202609220019_collaboration_teams.sql` |
| Skill Assessment (published learning tracks section) | `learning_tracks` | `202609220016_published_learning_tracks.sql` |

The browser displayed each feature's setup error. Separate read-only Supabase requests selecting zero rows confirmed `PGRST205` (table not present in the exposed schema cache). The shared core tables and `skill_taxonomy_version()` were available. This is an incomplete database rollout, not a Google sign-in failure.

Dashboard, Sessions & Events, Recruitment Tracker, Learning Programs, Industry Assessments, Career Readiness, Learning Plan, Skill Report, Portfolio, Credential Reviews, Marketplace, Applications, Internship Tracking, Profile, and Notifications loaded without workspace alerts. These were read-only page checks, not submissions, assessment attempts, uploads, or other write workflows. Notification email preferences and organization-verification tables were also absent, but did not block these page loads; their separate migrations are outside this repair.

## Apply the prepared repair

The project owner should review a current database backup, then open the SQL Editor for the project above and run the complete [student repair SQL](../supabase/repairs/student-pages-20261013.sql).

The file combines the four repository migrations listed above in their original order, inside one transaction. It adds the missing tables, functions, access policies and private collaboration-file bucket. It retains existing student records and does not create sample data. It checks base dependencies and refuses to run if any target table already exists. If that check fails, review which individual migrations were applied; do not drop existing tables to force this bundle to run.

This is an alternative to applying those four original migration files, not an additional migration to run afterward. Record these four versions in your team's migration tracking. Do not rerun their original files after applying this bundle. A complete rollout of other pending features should be handled separately using the normal migration workflow.

After the transaction succeeds, refresh the four affected pages. They should show available content or normal empty states, rather than setup errors. Verify write workflows separately with test accounts.

The local app's anon/service API keys cannot perform this schema update. Supabase SQL Editor access or an authorized PostgreSQL connection is required. No live database changes were made during this audit.

## Rebuild and test

`node scripts/build-student-page-repair.mjs` regenerates the SQL from the original migration files; it never connects to Supabase.

`node --test tests/student-page-repair.test.mjs tests/learning-tracks.test.mjs tests/collaboration-teams.test.mjs tests/initiatives-roster.test.mjs` tests the upgrade on an isolated local PostgreSQL fixture, preservation of existing profiles, authenticated reads, row-level security, repeat-run refusal, and the original feature workflows.
