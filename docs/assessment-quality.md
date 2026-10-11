# Assessment quality — blueprints and independently reviewed bank

The blueprint increment required no migration. The reviewed-bank increment requires `202609240023_reviewed_question_bank.sql` after the earlier migrations. Existing published versions and results are not rewritten. See [question-bank.md](question-bank.md) for activation and reviewer provisioning.

## Author workflow

Open Industry → Assessments → create/edit a draft linked to a real opportunity.

1. In AI Assessment Studio, select the opportunity skills that this assessment actually targets. Choose the question count and requested experience level. The default is Junior / Intern; the organizer must choose the appropriate level for the role.
2. Inspect the question blueprint: each selected skill receives at least one question, distributed in round-robin order. Balanced focus rotates applied fundamentals, practical scenarios and workplace judgment. Other focuses target one approach. These are authoring targets, not validated item-type classifications or measured difficulty.
3. Consent to sending the brief and blueprint to Gemini. The server independently constructs the blueprint; it does not trust a client-supplied question plan. A draft is rejected if the question count, answer format or per-question skill assignment disagrees with the plan. A changed brief during generation prevents stale results replacing the current editor.
4. Review every question. The prompt asks for sufficient scenario context, plausible distractors, one defensible answer, and reasoning about alternatives. Automated checks do not establish correctness or fairness.
5. Inspect duplicate-text, short-explanation and uncovered-opportunity-skill warnings. Explain why the correct answer is justified and why alternatives are not. Skills omitted from the selected blueprint may intentionally remain uncovered; this is not a failing score for those skills.
6. Save a draft and use **Submit saved questions for review** on its assessment card. An explicitly provisioned subject reviewer, different from the author, approves or rejects each immutable snapshot in Question Reviews. Correct rejected items in the editor and submit again. Approved questions can be reused from the editor's bank selector. Publishing requires every exact question snapshot to be approved; editing any question content requires new approval. The author still confirms opportunity relevance and the assessment target before publishing.

## Validation and persistence

Question/option normalization handles Unicode compatibility, whitespace, case and sentence-ending punctuation while preserving meaningful operators and language names such as `C++` and `C#`. The generation validator rejects duplicate normalized questions/options. The application save schema also rejects these duplicates in authored drafts. Existing database RPC validation remains in place; this increment does not add equivalent Unicode normalization constraints to direct database RPC calls.

Generation uses prompt version `industry-assessment-v2` and returns the blueprint. The authoring blueprint itself remains transient; saved questions, skill assignments and published author approval continue to use existing Supabase storage. The bank stores exact question snapshots, source assessment, author, reviewer and append-only review events in private Supabase tables. A persisted generation blueprint and full model provenance remain future work.

The one-question-per-skill minimum ensures coverage, not reliable measurement. Practice assessment generation, scoring algorithms, assessment weights and historical evidence are unchanged. This increment does not add executable coding tasks, free-text grading, adaptive difficulty, item-response analytics, accreditation or model fine-tuning.

## Verification

Tests cover blueprint allocation, insufficient counts, unsupported focus, skill-slot mismatch, duplicates, missing coverage and preservation of meaningful operators. Existing route tests exercise auth/consent, prompt isolation and validation failures with mocked provider responses. No live Gemini generation quality evaluation or authenticated browser review has been claimed. After activation, generate one consented non-software-role draft, check the selected skill coverage, independently solve every item, edit an answer and confirm publish approval resets before publishing.
