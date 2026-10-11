# AI personalized learning planner

Update: migration 018 is now also required for the shared AI request allowance. The old per-instance limiter is superseded; see `remaining-implementation-rollout.md`.

Apply `supabase/migrations/202609220012_ai_learning_plans.sql` after migration 011. Open Student → Learning plan. Manual goals remain available when the new planner migration or Gemini is unavailable.

Choose an open student job, internship, apprenticeship or live project, a target date within 180 days, and 1–40 weekly study hours. Generation requires explicit consent to send the required skill names, assessment status/scores/thresholds, time budget and relevant published learning metadata to Gemini. No name, email, resume or documents are selected. User-authored skill names may themselves contain personal information; avoid entering personal information into skill fields.

The server derives gaps from the latest evidence rather than trusting client scores. Missing evidence is unknown proficiency. A versioned system prompt treats supplied data as untrusted. Output must contain 1–8 unique required-skill steps, bounded weeks/hours, and real matching published resource IDs or null for self-directed practice. At most 40 relevant resources are supplied; this is not an exhaustive external learning search. Human review remains necessary for task quality, feasibility, prerequisites and safety. Course references inside free-text tasks are not independently verified; the structured linked resource is the authoritative program association.

Successful drafts are saved privately in Supabase with model, prompt version, target, budget and original output. Model and prompt labels describe generation configuration, not independently signed AI provenance; account-authored draft inserts are permitted by RLS. Drafts never create assessed evidence. Students edit tasks before explicitly approving. The database atomically creates ordinary learning goals and stores the reviewed steps and resulting IDs. Repeat approval returns those IDs. Duplicate existing active skill/target goals reject the whole batch; nothing is overwritten. Resource availability and skill relationship are rechecked. Remove a stale resource or generate a new draft if necessary.

Weeks are anchored at draft creation; due dates are the end of the assigned week capped at the target date. Late approval does not move dates forward. Progress, reflection and evidence URLs use existing learning-goal controls; completion is self-reported and reassessment is separate. Drafts remain private while accepted goals follow existing approved-institution visibility. The UI lists the latest 20 drafts/plans.

No automatic enrollment, publication, email, hiring decision, assessment score or credential is created. Gemini errors never produce template fallback plans. AI uses a 25-second timeout and best-effort one request per user per minute per instance. Configure provider budgets and distributed quotas before multi-instance deployment.

Validation: pure-output and disposable database tests cover fake resources, excessive workload, privacy, role restrictions, duplicate/atomic saves, repeat approval and absence of verified-skill creation. Live authenticated UI and Gemini checks remain necessary after applying the migration. The migration has not been applied to the connected project by this implementation.
