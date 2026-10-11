# Tech Pioneers demonstration cohort

The team explicitly authorized use of its current prototype Supabase project. These are **fictional demonstration records**, not real company partnerships, applicants, qualifications or placements. The original accounts are not replaced or edited. Demo activity appears in shared marketplace pages; it is not a separately isolated tenant.

## Contents

- 10 fictional industry accounts, 20 fictional students, 2 institutions and 4 academicians.
- 24 approved institution memberships (10 students and 2 faculty per institution).
- 10 internships, 10 jobs, 10 detailed workshops and 20 workshop enrollments.
- 40 applications moved through the real application RPC and recruiter stage transitions.
- 4 accepted active internships, each with a progress milestone, student log and accepted faculty supervisor.
- Self-declared skills and clearly fictional project portfolios. No verified certificates, independently approved assessment questions or completed placement outcomes are fabricated.

The demo account banner uses server-controlled auth app metadata. All account names, organizations, opportunity titles and descriptions explicitly identify demo data. No email invitation is sent: admin-created addresses use reserved `example.test` addresses, and email delivery preferences are not enabled.

## Credentials and walkthrough

Credentials, recovery sessions and account IDs are stored **only locally** in `.demo-private/cohort.json`, restricted to the local user (directory 0700, file 0600) and ignored by Git. Do not share, commit, screen-record or upload this file. Each account has its own random password. These accounts are login-capable and occupy the live team's Auth user quota. The script reuses its private demo sessions on retries and backs off on authentication rate limits; it does not disable or bypass them.

For a connected walkthrough, use `student5`, `industry5`, `institution1` and `faculty1`. Student 5 has an accepted cloud-operations internship, a project, workshop enrollment and a faculty supervisor. Another useful applicant is `student4`, with scheduled interview activity. Institution 1 can see its authorized cohort's actual saved activity. Existing signed-in accounts do not automatically become demo users: sign in with a demo account to see its personal dashboard.

## Operations

From the project directory, with the configured `.env.local`:

```sh
node --env-file=.env.local scripts/demo-cohort.mjs --apply-current-team-database
node --env-file=.env.local scripts/verify-demo-cohort.mjs
```

Do not run parallel seed processes. The script checkpoints completed stages and refuses an email collision with an unrelated user or a manifest from another project. Preserve the manifest for safe recovery; do not delete it and rerun. It creates records only; it is not a general reset/cleanup utility. A crash between a workflow RPC and its local checkpoint can require inspection before retrying non-idempotent workflow transitions. Dates are anchored to the first run and do not automatically extend on later runs.

The service-role key is used for Auth provisioning and read-only recovery lookups. User-scoped sessions perform profile, membership, opportunity, application, enrollment and supervision actions. Database permissions and workflow triggers remain enabled. Newly created auth accounts and intermediate steps may persist if execution fails; the manifest identifies them for recovery. No cleanup has been performed.

Before recording, complete a genuine reviewer-driven demo assessment workflow if you want to show assessment completion, and review privacy/framing. The seeded cohort does not provide accreditation, evaluation of real people, or real-world impact metrics. No AI usage or paid generation is required to populate this cohort.
