import test from "node:test";
import assert from "node:assert/strict";
import { summarizeOutcomeMonths } from "../lib/outcome-summary.mjs";

test("period totals sum independent events without fabricating a funnel", () => {
  const months = [
    {
      month: "2026-09",
      applications: 0,
      learningCompletions: 2,
      confirmedJoinings: 3,
    },
    {
      month: "2026-10",
      applications: 1,
      learningCompletions: 0,
      confirmedJoinings: 0,
    },
  ];
  const original = structuredClone(months);
  assert.deepEqual(summarizeOutcomeMonths(months), {
    totals: { applications: 1, learningCompletions: 2, confirmedJoinings: 3 },
    hasActivity: true,
  });
  assert.deepEqual(months, original);
});
test("empty and zero records remain zero", () => {
  for (const months of [
    [],
    [
      {
        month: "2026-10",
        applications: 0,
        learningCompletions: 0,
        confirmedJoinings: 0,
      },
    ],
  ])
    assert.deepEqual(summarizeOutcomeMonths(months), {
      totals: { applications: 0, learningCompletions: 0, confirmedJoinings: 0 },
      hasActivity: false,
    });
});
test("invalid counts never silently become trustworthy metrics", () => {
  for (const value of [-1, 1.5, NaN, Infinity, "2", undefined])
    assert.throws(
      () =>
        summarizeOutcomeMonths([
          { applications: value, learningCompletions: 0, confirmedJoinings: 0 },
        ]),
      /whole numbers/,
    );
});
