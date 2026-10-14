import test from "node:test";
import assert from "node:assert/strict";
import { groupStudentReports } from "../lib/student-reports.mjs";

test("students without completed assessments have two empty report sections", () => {
  assert.deepEqual(groupStudentReports([], "me"), { skills: [], industry: [] });
  assert.deepEqual(groupStudentReports([{ userId: "other" }], "me"), {
    skills: [],
    industry: [],
  });
});

test("reports are scoped to the student and separated including older industry records", () => {
  const reports = [
    { id: "practice", userId: "me", assessmentKind: "practice" },
    { id: "industry", userId: "me", assessmentKind: "industry" },
    { id: "legacy", userId: "me", industryAssessmentId: "assessment-id" },
    { id: "foreign", userId: "other", assessmentKind: "industry" },
  ];
  const grouped = groupStudentReports(reports, "me");
  assert.deepEqual(
    grouped.skills.map((r) => r.id),
    ["practice"],
  );
  assert.deepEqual(
    grouped.industry.map((r) => r.id),
    ["industry", "legacy"],
  );
  assert.deepEqual(groupStudentReports(reports, undefined), {
    skills: [],
    industry: [],
  });
});
