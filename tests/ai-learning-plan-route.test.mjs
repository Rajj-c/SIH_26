import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as planner from "../lib/ai/learning-planner.mjs";
import { explainReadiness } from "../lib/readiness.mjs";
import { skillKey } from "../lib/skill-taxonomy.mjs";
const compiled = ts.transpileModule(
  readFileSync(
    new URL("../app/api/ai/learning-plan/route.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const targetId = "11111111-1111-4111-8111-111111111111";
function harness({
  user = { id: "me" },
  role = "student",
  ok = true,
  steps = [
    {
      skill: "React",
      week: 1,
      hours: 2,
      task: "Build a component and attach a short test report.",
      resource_id: null,
    },
  ],
} = {}) {
  const sent = [],
    inserted = [],
    queries = [];
  const db = {
    rpc: async (name) => {
      assert.equal(name, "reserve_ai_request");
      return { data: sent.length ? 60 : 0, error: null };
    },
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      let insertedRow;
      const filters = [];
      queries.push({ table, filters });
      const result = () => ({
        error: null,
        data: insertedRow
          ? { id: "plan", ...insertedRow }
          : table === "profiles"
            ? { role }
            : table === "opportunities"
              ? {
                  id: targetId,
                  skills: ["React"],
                  status: "Open",
                  deadline: "2099-01-01",
                  audience: "student",
                  type: "Job",
                }
              : [],
      });
      const chain = {
        select() {
          return chain;
        },
        eq(...args) {
          filters.push(args);
          return chain;
        },
        order() {
          return chain;
        },
        range() {
          return chain;
        },
        limit() {
          return chain;
        },
        insert(row) {
          insertedRow = row;
          inserted.push(row);
          return chain;
        },
        single: async () => result(),
        then(resolve, reject) {
          return Promise.resolve(result()).then(resolve, reject);
        },
      };
      return chain;
    },
  };
  const exports = {};
  new Function("exports", "require", "process", "fetch", compiled)(
    exports,
    (name) =>
      name === "next/server"
        ? {
            NextResponse: {
              json: (body, options) => ({ body, status: options.status }),
            },
          }
        : name.includes("learning-planner")
          ? planner
          : name.includes("readiness")
            ? { explainReadiness }
            : name.includes("skill-taxonomy")
              ? { skillKey }
              : { createClient: async () => db },
    { env: { GEMINI_API_KEY: "test-key" } },
    async (url, options) => {
      sent.push(JSON.parse(options.body));
      return {
        ok,
        json: async () => ({
          candidates: [
            {
              finishReason: "STOP",
              content: { parts: [{ text: JSON.stringify(steps) }] },
            },
          ],
        }),
      };
    },
  );
  const body = {
    targetId,
    targetDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    weeklyHours: 5,
    consent: true,
  };
  return {
    sent,
    inserted,
    queries,
    post: (change = {}) =>
      exports.POST(
        new Request("http://localhost/api/ai/learning-plan", {
          method: "POST",
          body: JSON.stringify({ ...body, ...change }),
        }),
      ),
  };
}
test("learning planner route requires student access and consent", async () => {
  for (const [config, status] of [
    [{ user: null }, 401],
    [{ role: "industry" }, 403],
  ]) {
    const h = harness(config);
    assert.equal((await h.post()).status, status);
    assert.equal(h.sent.length, 0);
  }
  const h = harness();
  assert.equal((await h.post({ consent: false })).status, 400);
  assert.equal(h.sent.length, 0);
});
test("learning planner derives own evidence, persists only validated draft and records prompt version", async () => {
  const h = harness();
  const r = await h.post();
  assert.equal(r.status, 200);
  assert.equal(h.inserted.length, 1);
  assert.equal(h.inserted[0].prompt_version, planner.PLAN_PROMPT_VERSION);
  assert.equal(h.inserted[0].target_id, targetId);
  assert.ok(
    h.queries
      .find((q) => q.table === "skill_evidence")
      .filters.some(([k, v]) => k === "user_id" && v === "me"),
  );
  const facts = JSON.parse(h.sent[0].contents[0].parts[0].text);
  assert.equal(facts.gaps[0].status, "No evidence");
  assert.equal(facts.weekly_hours, 5);
  assert.equal((await h.post()).status, 429);
});
test("failed provider or invented resource creates no persisted draft", async () => {
  for (const config of [
    { ok: false },
    {
      steps: [
        {
          skill: "React",
          week: 1,
          hours: 2,
          task: "Practice the skill with a small test project.",
          resource_id: "invented",
        },
      ],
    },
  ]) {
    const h = harness(config);
    assert.ok((await h.post()).status >= 500);
    assert.equal(h.inserted.length, 0);
  }
});
