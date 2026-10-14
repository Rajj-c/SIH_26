import test from "node:test";
import assert from "node:assert/strict";
import {
  starterLearningTracks,
  getStarterLearningTrack,
} from "../lib/starter-learning-tracks.mjs";

test("every starter course has unique, resolvable practice routes and study notes", () => {
  assert.equal(starterLearningTracks.length, 20);
  assert.equal(
    new Set(starterLearningTracks.map((course) => course.id)).size,
    20,
  );
  for (const course of starterLearningTracks) {
    assert.equal(getStarterLearningTrack(course.id), course);
    assert.ok(course.modules.length > 0);
    assert.equal(
      new Set(course.modules.map((module) => module.id)).size,
      course.modules.length,
    );
    for (const module of course.modules) {
      assert.ok(module.description.length > 100);
      assert.ok(module.subTopics.length > 0);
      assert.ok(
        ["very-beginner", "beginner", "intermediate", "advanced"].includes(
          module.level,
        ),
      );
    }
  }
  assert.equal(getStarterLearningTrack("starter-missing"), null);
  assert.equal(getStarterLearningTrack("__proto__"), null);
});

test("the catalog includes creative, business, and non-computing engineering courses", () => {
  for (const id of [
    "digital-marketing",
    "content-creation",
    "mechanical-engineering",
    "civil-engineering",
    "human-resources",
  ]) {
    assert.ok(getStarterLearningTrack("starter-" + id));
  }
});
