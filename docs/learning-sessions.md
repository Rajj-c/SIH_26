# Workshops, guest lectures and mentorship sessions

Apply `supabase/migrations/202609220015_learning_sessions.sql` once, after migrations 001–014, in Supabase SQL Editor. This phase requires no new provider credentials. No sample records are inserted.

Each portal has **Sessions & Events**. Industry, academicians and institutions can schedule sessions; students and academicians can register for eligible sessions. Organizers cannot register for their own sessions. Sessions optionally link to the organizer's open learning program; registration then requires an Enrolled or Completed program enrollment.

## Lifecycle

- Schedule a future session with title, audience, speaker, agenda, timezone-aware start/end, registration deadline, capacity and private meeting details.
- Learners register or cancel before the session starts. New registrations close at the specified deadline. Capacity is checked under a database row lock.
- Only organizers record Present/Absent after the start. They can correct attendance until completion. Completion requires the end time to have passed and attendance for every registered learner.
- Cancellation is unavailable after attendance is recorded. Completion and cancellation notify registered participants; registrations and withdrawals notify organizers.
- Present learners can submit one rating and feedback after completion. Feedback is identifiable and visible to the organizer and approved institution.
- Institutions see participation for their approved members in the Approved members view. Revoking membership removes that access.

## Privacy and boundaries

Supabase RLS restricts registration records to their learner, organizer and approved institution. Meeting details are separate from public session metadata and readable only by the organizer or a registered participant. Do not paste private meeting links into the public agenda. Calendar downloads use the signed-in user's access, are private non-cacheable `.ics` snapshots, and do not send invitations or synchronize later changes. Remove cancelled events from imported calendars manually.

Published schedules are immutable: cancel and publish a new session to change them. Attendance retains the most recent recorder and timestamp, not an append-only correction history. Existing registrations are not automatically withdrawn if linked-program enrollment changes. Cancellation preserves registration history and meeting-detail access for existing registered participants.

Attendance does not award skills, certificates or program completion. This phase does not include AI agenda drafting, automatic email/reminders, waitlists, QR check-in or external calendar synchronization. Speaker and publisher claims are not independently verified.

## Verification

`tests/learning-sessions.test.mjs` exercises the real migrations in a disposable PGlite database: organizer permissions, audience, capacity, duplicate registration, withdrawal/rejoin, private access, institution scope and revocation, attendance timing, completion rules, cancellation, notifications, feedback and linked-program enrollment. Calendar tests check UTC serialization and text escaping. These checks do not substitute for a live Supabase/browser acceptance test after migration.
