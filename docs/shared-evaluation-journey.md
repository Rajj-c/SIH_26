# Shared evaluation journey

Owner-approved, clearly labelled fictional activity in the four public guest
accounts. The current database also contains other records: this is not an
isolated tenant and normal role permissions still apply.

## Saved journey

- Four evaluation profiles; student has three self-declared skills and a sample
  project. No assessed proficiency or independent verification is claimed.
- Student and academician are approved members of the guest institution.
- Guest industry publishes **Evaluation Demo · Web platform internship**.
- Guest student applies, moves through simulated review/shortlisting, receives
  an offer, and accepts an internship beginning on the setup date.
- A requirements/test-plan milestone and simulated progress log are saved.
  Industry feedback requests clearer acceptance criteria; milestone remains
  pending, not approved or completed.
- Institution assigns the guest academician as faculty supervisor, and the
  academician accepts. No access is granted to unrelated private records.
- Industry publishes **Evaluation Demo · Practical web and SQL workshop** with
  outcomes, curriculum, prerequisites, schedule, instructor, terms and review
  requirements. Student enrolls. Enrollment is not course completion.

All data writes use the four guest accounts' normal authenticated permissions,
not a service-role client. No external messages, certificates, completed
placements, assessment scores, report approvals or verified badges were created.
The guest banner now recognizes server-controlled evaluation-account metadata.

## Operation

```sh
node --env-file=.env.local scripts/seed-shared-evaluation-journey.mjs --apply-evaluation-journey
```

Do not run concurrently. The script authenticates and verifies all identities
before writes. Stable record keys and scoped lookups support retry after partial
failure. Existing progressed/declined applications are not reset. It is not a
general synchronization or reset tool: records edited or removed by public
visitors can require manual inspection. Operations are persistent and not one
transaction. Dates are not automatically renewed for an existing internship or
program. Existing team records are not edited.

## Verification

Provisioning verified saved application visibility for student, industry and
institution, and the faculty supervision response under the academician's own
session. Student browser dashboard loaded all data sources and displayed one
application, one active learning enrollment, zero reviewed completions and zero
report-reviewed internships. All 102 automated tests and type checks passed.

Faculty report feedback requires an actual submitted report; none was fabricated.
Industry browser dashboard also loaded one application and zero job offers or
confirmed joinings. The evaluation banner appeared correctly.
Institution browser dashboard loaded all four sources, one student in the
student-filtered cohort and one active learning enrollment. At 390 x 844 the
dashboard rendered with the glass layout, and the All pages menu exposed the
role navigation successfully. Viewport override was reset afterward.

Live faculty testing identified a deployment blocker: `collaboration_members`
and `collaboration_files` return PGRST205 (not found in the PostgREST schema
cache), while the other four collaboration tables load successfully. Faculty
supervision loads but the combined dashboard correctly withholds metrics rather
than treating the missing collaboration source as empty. Apply the existing
`202609220019_collaboration_teams.sql` migration if absent; if its tables already
exist, refresh the PostgREST schema cache instead of rerunning the migration.
This migration was not applied during this run.
File-upload and full mobile acceptance testing are separate from these saved
workflow checks. No claim of a completed real internship or real workshop is made.
