# Credential review inbox integration

Apply `202609220014_credential_review_notifications.sql` after migration 013. New requests notify only the designated, currently approved institution. Approved, Changes requested, Declined and Revoked decisions notify only the requesting student. No self-notifications. Superseding remains in history without an extra inbox item; its replacement request generates the actionable notice.

Notifications are inserted by an event trigger in the source transaction. Rollbacks and rejected actions produce no notices. Event IDs provide unique delivery keys; reusing an unchanged request creates no extra event/notice. Historical reviews are not backfilled.

Inbox text omits names, certificate titles, issuer details, document links and review feedback. The link contains only the review reference and role destination. It opens that review with expanded history. Current status—not the old message—determines available actions. Unknown or inaccessible references display the same unavailable message. Membership removal revokes institution access even when an old notice remains. Opening the link does not automatically mark it read or confer access.

Review pages also offer status queues. Existing polling, recipient RLS, unread counts and read actions are reused. No email, push, scheduled reminder, external connection or AI decision is added.

Disposable database tests cover recipients, duplicate retries, rollback, private content, unauthorized actors, all decision types, superseding and membership removal. After activation, check a real student request → institution inbox → review decision → student inbox. Also check mobile, unknown links and membership removal. Browser verification remains pending.
