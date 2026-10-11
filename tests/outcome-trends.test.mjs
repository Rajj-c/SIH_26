import test from "node:test";
import assert from "node:assert/strict";
import { buildOutcomeTrends } from "../lib/outcome-trends.mjs";
const input = {
  from: "2026-09-01",
  to: "2026-09-30",
  platform: {
    profile: { id: "inst", role: "institution" },
    memberships: [
      { institution_id: "inst", member_id: "member", status: "Approved" },
      { institution_id: "other", member_id: "outsider", status: "Approved" },
    ],
    directory: [
      { id: "member", department: "Engineering", graduation_year: 2027 },
      { id: "outsider" },
    ],
    opportunities: [
      {
        id: "job",
        ownerId: "employer",
        type: "Job",
        publishedAt: "2026-09-01T00:00:00Z",
        skills: ["React", "react.js"],
      },
      {
        id: "training",
        type: "Training",
        publishedAt: "2026-09-01T00:00:00Z",
        skills: ["Fake demand"],
      },
    ],
    applications: [
      {
        id: "a",
        applicantId: "member",
        opportunityId: "job",
        appliedAt: "2026-09-10T00:00:00Z",
      },
      {
        id: "b",
        applicantId: "outsider",
        opportunityId: "job",
        appliedAt: "2026-09-10T00:00:00Z",
      },
    ],
  },
  learning: {
    enrollments: [
      {
        learner_id: "member",
        status: "Completed",
        completed_at: "2026-09-11T00:00:00Z",
      },
      {
        learner_id: "outsider",
        status: "Completed",
        completed_at: "2026-09-11T00:00:00Z",
      },
    ],
    programs: [],
  },
  recruitment: {
    offers: [
      {
        application_id: "a",
        response: "Accepted",
        employer_joined_at: "2026-09-20T00:00:00Z",
        applicant_joined_at: null,
      },
    ],
  },
};
test("outcome explorer uses current approved scope and dated facts without inflating skills or joining", () => {
  const m = buildOutcomeTrends(input);
  assert.equal(m.cohortSize, 1);
  assert.deepEqual(m.months, [
    {
      month: "2026-09",
      applications: 1,
      learningCompletions: 1,
      confirmedJoinings: 0,
    },
  ]);
  assert.equal(m.demand.length, 1);
  assert.equal(m.demand[0].opportunities, 1);
  assert.equal(m.demand[0].skill, "React");
  const joined = structuredClone(input);
  joined.recruitment.offers[0].applicant_joined_at = "2026-10-01T00:00:00Z";
  assert.equal(buildOutcomeTrends(joined).months[0].confirmedJoinings, 0);
  assert.equal(
    buildOutcomeTrends({ ...input, department: "Other" }).cohortSize,
    0,
  );
  assert.throws(() => buildOutcomeTrends({ ...input, from: "2026-02-30" }));
  assert.throws(() => buildOutcomeTrends({ ...input, from: "2024-01-01" }));
});
