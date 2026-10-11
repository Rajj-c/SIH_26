# Independently reviewed question bank

## Activation

Apply `supabase/migrations/202609240023_reviewed_question_bank.sql` in Supabase SQL Editor after the existing migrations. It adds no sample questions or user data. It does not alter existing published assessments or historical results.

New publications now fail closed until every question has an exact approved snapshot owned by the author. Save drafts remains available. An administrator must provision at least one trusted subject expert; the application deliberately cannot provision itself or ordinary users as reviewers. Organization-verification reviewer membership does **not** grant question-review access.

After choosing an existing academician, industry or institution account whose expertise you trust, look up that account's profile UUID in your project and run this SQL with the real UUID substituted:

```sql
insert into private.question_reviewers(user_id)
values ('REPLACE_WITH_VERIFIED_PROFILE_UUID'::uuid)
on conflict do nothing;
```

Use a different account from the assessment author. Do not paste secrets into chat. To remove future review access, delete that specific UUID from `private.question_reviewers` in SQL Editor. Removing membership does not undo previous review decisions; revoke affected approvals separately if warranted.

## Connected workflow

1. Industry saves an assessment draft linked to its own opportunity.
2. On the assessment card, **Submit saved questions for review** snapshots its stored questions. Unsaved editor changes are not submitted. Exact pending/approved duplicates are skipped.
3. The subject reviewer opens **Question Reviews** in their portal. Independently solve each item and inspect all options, explanations, relevance, ambiguity, accessibility and fairness. Record a meaningful rationale to approve or request correction. An author can never review their own snapshot, even if allowlisted.
4. Industry sees status/history in **Question Bank**, corrects rejected items in the studio and resubmits. Snapshot content cannot be edited. Approved questions can be imported into other assessments by the same author.
5. Publish the assessment. A database trigger checks exact question content (excluding only database-assigned item IDs) against approved bank entries. Changed wording, options, key, explanation, skill or category requires fresh review. Failed publication rolls back the assessment status atomically. The database also enforces this for direct RPC callers.

All bank keys/history live in the private schema. Only the author and provisioned subject reviewers can read them through the controlled RPC. Students and unrelated employers cannot browse bank keys. The learner assessment endpoint continues to omit answers/explanations before submission; existing post-submission explanations are unchanged.

Reviewers can revoke an approved item. Revocation blocks **future publication/reuse**, not previously published assessments or existing attempts. Historical assessments remain immutable; an assessment withdrawal/incident-remediation workflow is not included. Do not interpret revocation as automatic cancellation of live tests.

## Scope and verification

The bank shows the latest 500 accessible items with local search/status filters. It is author-private, not a global answer-key catalog. Subject reviewer access covers all bank submissions; assign only trusted experts. Approval is expert attestation, not accreditation, psychometric validation or a guarantee of correctness. No reviewer accounts are auto-created or auto-approved. Existing older publications do not retroactively gain independent-review status.

`tests/question-bank.test.mjs` applies migration 023 after a pre-migration historical publication in disposable local PostgreSQL. It checks unauthorized reads/writes, self-review denial, publication rollback, exact-key changes, valid approval, review transitions, revocation, student key privacy and preservation of historical publications. Earlier migration regression tests intentionally retain their pre-023 behavior.

After applying the migration, test the two-account workflow in the live browser with real author-created questions. Live Supabase deployment, authenticated browser interactions and subject-matter accuracy are not established by the automated local tests. No external reviewer invitation/email delivery is added in this increment.
