import test from "node:test";
import assert from "node:assert/strict";
import {
  evaluatorAccess,
  requireEvaluatorProject,
} from "../lib/evaluator-access.mjs";

const accounts = [
  ["student", "student5"],
  ["industry", "industry5"],
  ["academician", "faculty1"],
  ["institution", "institution1"],
].map(([role, key]) => ({
  role,
  email: `tp-demo-${key}@example.test`,
  password: "test-only-public-password",
  session: "must-not-be-exported",
}));
const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://sandbox.supabase.co",
  EVALUATOR_SUPABASE_URL: "https://sandbox.supabase.co",
  PRIMARY_SUPABASE_URL: "https://primary.supabase.co",
  EVALUATOR_ACCESS_ENABLED: "true",
  EVALUATOR_ACCOUNTS_JSON: JSON.stringify(accounts),
};

test("evaluator access is off by default and primary deployments expose only a demo link", () => {
  assert.deepEqual(evaluatorAccess({}), { mode: "disabled" });
  assert.deepEqual(
    evaluatorAccess({ EVALUATOR_DEMO_URL: "https://demo.example.test/login" }),
    { mode: "external", url: "https://demo.example.test/login" },
  );
  for (const url of [
    "javascript:alert(1)",
    "http://example.test",
    "https://name:secret@example.test",
    "https://example.test?token=secret",
  ])
    assert.throws(() => evaluatorAccess({ EVALUATOR_DEMO_URL: url }));
});
test("public guest credentials require a distinct, matching hosted Supabase project", () => {
  assert.equal(requireEvaluatorProject(env), "https://sandbox.supabase.co");
  for (const patch of [
    { PRIMARY_SUPABASE_URL: env.EVALUATOR_SUPABASE_URL },
    { NEXT_PUBLIC_SUPABASE_URL: env.PRIMARY_SUPABASE_URL },
    { PRIMARY_SUPABASE_URL: "" },
    { EVALUATOR_SUPABASE_URL: "https://sandbox.supabase.co.attacker.test" },
  ])
    assert.throws(() => evaluatorAccess({ ...env, ...patch }));
  for (const key of [
    "GEMINI_API_KEY",
    "RESEND_API_KEY",
    "NOTIFICATION_JOB_SECRET",
  ])
    assert.throws(() => evaluatorAccess({ ...env, [key]: "configured" }));
});
test("only four designated demo identities are published, never manifest session fields", () => {
  const result = evaluatorAccess(env);
  assert.equal(result.mode, "sandbox");
  assert.equal(result.accounts.length, 4);
  assert.equal(JSON.stringify(result).includes("must-not-be-exported"), false);
  for (const list of [
    accounts.slice(1),
    [...accounts.slice(0, 3), accounts[0]],
    accounts.map((a) => ({ ...a, email: "real@example.com" })),
    accounts.map((a) => ({ ...a, password: "short" })),
  ])
    assert.throws(() =>
      evaluatorAccess({
        ...env,
        EVALUATOR_ACCOUNTS_JSON: JSON.stringify(list),
      }),
    );
});
