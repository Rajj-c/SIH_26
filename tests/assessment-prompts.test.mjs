import test from "node:test";
import assert from "node:assert/strict";
import {
  assessmentSystemPrompt,
  validateAssessmentInput,
  validateGeneratedQuestions,
  buildAssessmentBlueprint,
  assessQuestionDraft,
  normalizeQuestionText,
} from "../lib/ai/assessment-prompts.mjs";
const brief = {
  consent: true,
  title: "Manufacturing trainee",
  skills: ["Quality inspection"],
  count: 1,
  difficulty: "Junior / Intern",
  categoryFocus: "Balanced",
};
const q = {
  question: "Which inspection step should occur before releasing this batch?",
  options: [
    "Compare measurements to the specification",
    "Ignore all recorded defects",
    "Guess based on appearance",
    "Skip inspection entirely",
  ],
  correctAnswer: 0,
  explanation:
    "Compare the measured dimensions against the documented specification.",
  skillArea: "Quality inspection",
  category: "Technical",
};
test("assessment briefs require consent, bounded fields, actual skills and supported counts", () => {
  assert.equal(validateAssessmentInput(brief).title, brief.title);
  for (const input of [
    { ...brief, consent: false },
    { ...brief, skills: [] },
    { ...brief, count: 1.5 },
    { ...brief, count: 16 },
    { ...brief, description: "x".repeat(6001) },
  ])
    assert.throws(() => validateAssessmentInput(input));
});
test("blueprints cover each selected skill and reject undersized or unsupported briefs", () => {
  const plan = buildAssessmentBlueprint(
    ["Quality inspection", "Communication"],
    5,
    "Balanced",
  );
  assert.deepEqual(
    plan.map((p) => p.skill),
    [
      "Quality inspection",
      "Communication",
      "Quality inspection",
      "Communication",
      "Quality inspection",
    ],
  );
  assert.equal(plan[1].approach, "Practical scenario");
  assert.throws(() =>
    validateAssessmentInput({ ...brief, skills: ["One", "Two"], count: 1 }),
  );
  assert.throws(() =>
    validateAssessmentInput({ ...brief, categoryFocus: "Invented focus" }),
  );
  const input = validateAssessmentInput({
    ...brief,
    skills: ["Quality inspection", "Communication"],
    count: 2,
  });
  assert.throws(
    () =>
      validateGeneratedQuestions(
        JSON.stringify([
          q,
          {
            ...q,
            question:
              "Which inspection measurement establishes compliance with the given specification?",
          },
        ]),
        input,
      ),
    /blueprint skill/,
  );
});
test("draft review highlights gaps and normalized duplicates without erasing code operators", () => {
  const review = assessQuestionDraft(
    [q, { ...q, question: q.question.toUpperCase().replace("?", "!") }],
    ["Quality inspection", "Communication"],
  );
  assert.ok(review.issues.some((i) => i.includes("duplicates another")));
  assert.deepEqual(review.uncovered, ["Communication"]);
  assert.notEqual(normalizeQuestionText("C++"), normalizeQuestionText("C#"));
  assert.notEqual(
    normalizeQuestionText("x < 5"),
    normalizeQuestionText("x > 5"),
  );
  assert.equal(
    normalizeQuestionText("Full   WIDTH?"),
    normalizeQuestionText("Ｆull WIDTH!"),
  );
});
test("valid non-software questions preserve author context and answer key", () => {
  assert.deepEqual(validateGeneratedQuestions(JSON.stringify([q]), brief), [q]);
  assert.match(assessmentSystemPrompt, /not an assumed software domain/);
  assert.match(assessmentSystemPrompt, /untrusted DATA/);
});
test("invalid keys, unknown skills, duplicate options and missing fields never receive defaults", () => {
  for (const change of [
    { correctAnswer: 4 },
    { correctAnswer: "0" },
    { correctAnswer: null },
    { skillArea: "Invented skill" },
    { options: ["A", "a", "B", "C"] },
    { explanation: "" },
    { category: "Personality" },
  ])
    assert.throws(() =>
      validateGeneratedQuestions(JSON.stringify([{ ...q, ...change }]), brief),
    );
  assert.throws(() => validateGeneratedQuestions("not JSON", brief));
  assert.throws(() => validateGeneratedQuestions(JSON.stringify([]), brief));
  assert.throws(() =>
    validateGeneratedQuestions(JSON.stringify([q, q]), { ...brief, count: 2 }),
  );
});
