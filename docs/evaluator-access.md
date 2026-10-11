# Public evaluator access: isolated deployment

## Updated owner decision: shared evaluation accounts

The owner subsequently requested four public accounts in the current project:
student@guest.com, industry@guest.com, academician@guest.com and
institution@guest.com. Their explicitly chosen public passwords are stored in
`lib/shared-evaluator-accounts.mjs`. They are shown separately under expandable
role headings, each labelled for evaluation purposes only.

`EVALUATOR_SHARED_GUESTS_ENABLED=pending` displays the requested credentials but
disables the fill button and explicitly says setup is pending. Set it to `true`
only after this command succeeds:

```sh
node --env-file=.env.local scripts/provision-shared-evaluators.mjs --create-public-guests-in-current-project
```

The script checks all four addresses for collisions first, creates new users
without sending mail, verifies password sign-in and profile roles, and never
resets existing passwords. It does not create memberships, applicants, verified
credentials, or reviewer permissions. Each new profile starts with its actual
empty records. These accounts have normal role permissions in the shared DB;
they are NOT read-only or isolated. Never upload private documents to them.
Account creation is persistent and not transactional; reruns recognize only
accounts marked with the server-controlled evaluation batch. Earlier created
accounts are not deleted if a later step fails.

After the owner reactivated Supabase, provisioning succeeded for all four
requested accounts. Each password sign-in and assigned profile role was verified.
Local `EVALUATOR_SHARED_GUESTS_ENABLED` is now `true`; deployed environments must
set the same flag separately. No email was sent and no existing records or
reviewer permissions were changed. These are new empty guest profiles, not copies
of existing demo users' activity.

The first provisioning attempt failed during the read-only account-list check
because the configured Supabase hostname could not resolve (ENOTFOUND). No
guest accounts were created by that attempt. The later successful retry above
supersedes that blocker. The previous isolated option below remains
available but is not required by the owner's revised request.

## Status

Login UI, fail-closed configuration validation, and provisioning/export tooling
are implemented. No second project, guest accounts, or public deployment have
been created by this change. Current team credentials are not exposed.

## Required setup

1. Create a **new Supabase project** and a separate app deployment. Never copy
   the current database, users, documents or `.demo-private/cohort.json` into it.
2. Run `supabase/bootstrap/empty-evaluator-project.sql` on the new empty project
   first (the platform migrations expect the base profiles table). Then apply
   the repository migrations in filename order to the new project. Supply
   its URL and anon key to the separate app build. The browser Supabase URL is
   build-time configuration: a runtime-only change is insufficient.
3. In a gitignored `.env.evaluator.local`, configure the NEW project's
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and provisioning-only
   `SUPABASE_SERVICE_ROLE_KEY`. Set `PRIMARY_SUPABASE_URL` to the actual team
   project URL and `EVALUATOR_SUPABASE_URL` to the new project URL. Keep Gemini,
   Resend and the notification-worker secret unset. Review these target URLs
   before running any provisioning command.
4. Provision labelled fictional accounts and connected workflows:

   ```sh
   node --env-file=.env.evaluator.local scripts/demo-cohort.mjs --apply-isolated-evaluator-project
   node --env-file=.env.evaluator.local scripts/export-evaluator-access.mjs
   ```

   The seed refuses matching primary/demo projects and non-demo Auth users.
   Its manifest is separate at `.demo-private/evaluator/cohort.json`. Provisioning
   creates persistent sandbox records and is not transactional. Preserve the
   manifest for retries. Do not run concurrent seed processes or delete manifests.
5. Set the demo deployment's `EVALUATOR_ACCOUNTS_JSON` from the generated
   `public-guest-accounts.json`, plus both project URL guard variables and
   `EVALUATOR_ACCESS_ENABLED=true`. Never copy session tokens or the full manifest.
   Do not configure service-role provisioning credentials on the public app.
6. Set the primary deployment's `EVALUATOR_DEMO_URL` to the demo's HTTPS login URL.
   Keep `EVALUATOR_ACCESS_ENABLED=false` on the primary app. It will show only a
   link, never guest credentials.

## What evaluators can do

Four shared accounts (student5, industry5, faculty1, institution1) have normal
role permissions in the isolated sandbox, not read-only access. Expand a role
on the demo login page to see public credentials, fill them using the button,
then press Sign In. Actions affect other evaluators' demo views. Roles remain
subject to the existing database policies; no reviewer/admin role is provided.

Do not collect real personal data, upload real documents or invite real users.
Disable new sign-ups and email/OAuth providers in the demo project's Auth settings
after provisioning. Keep external delivery and paid AI disabled. AI UI will show
its existing unconfigured state; this is not a live AI demonstration.

Public credentials can be changed or abused by visitors using normal Auth APIs.
This is a disposable sandbox, not an immutable exhibit. Monitor storage/usage,
apply hosting rate limits, and retain a controlled reset/reprovision procedure.
Turning off the login section does NOT revoke previously published credentials:
ban the dedicated demo users or pause the demo project when evaluation ends.
Never use these credentials for any real account or service.

Configuration guards prevent common mistakes, but cannot verify that an operator
has truthfully designated the primary URL or kept all real data out of a project.
Review target identity and contents before enabling public access. No automated
reset, deployment, account revocation or infrastructure rate limiting is claimed.
