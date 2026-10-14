import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as redirects from "../lib/oauth-redirect.mjs";

test("Google login and signup use the exact callback on the initiating host", () => {
  for (const origin of ["http://localhost:3000", "http://localhost:3001", "https://portal.example.com"]) {
    for (const context of [{ mode: "login", next: "/student/portfolio?tab=projects" }, { mode: "signup", role: "academician" }]) {
      const document = { cookie: "" };
      assert.equal(redirects.prepareOAuthRedirect(origin, context, document), `${origin}/auth/callback`);
      const value = document.cookie.split(";")[0].split("=")[1];
      const restored = redirects.readOAuthContext(value);
      assert.equal(restored.mode, context.mode);
      assert.equal(restored.role, context.role || null);
      assert.equal(restored.next, context.next || null);
      assert.match(document.cookie, /Max-Age=600; SameSite=Lax/);
      assert.equal(document.cookie.includes("; Secure"), origin.startsWith("https:"));
    }
  }
});

test("return paths stay within the assigned role and preserve query parameters", () => {
  assert.equal(redirects.roleReturnPath("/student/portfolio?tab=projects#work", "student"), "/student/portfolio?tab=projects#work");
  for (const path of ["https://evil.example", "//evil.example", "/\\evil.example", "/industry", "/student/../../industry", "/student/%2e%2e/industry", "/studentish", null]) {
    assert.equal(redirects.roleReturnPath(path, "student"), "/student");
  }
  assert.deepEqual(redirects.readOAuthContext("invalid"), { mode: "login", role: null, next: null });
});

const compiled = ts.transpileModule(readFileSync(new URL("../app/auth/callback/route.js", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function callbackHarness({ context, profileRole = "student", exchangeError = false }) {
  const deleted = [];
  const savedProfiles = [];
  const user = { id: "test-user", email: "test@example.com", user_metadata: {} };
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => exchangeError ? { error: new Error("expired") } : { data: { user } },
      getUser: async () => ({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profileRole ? { role: profileRole } : null }) }) }),
      upsert: async (profile) => { savedProfiles.push(profile); return {}; },
    }),
  };
  const modules = {
    "next/server": { NextResponse: { redirect: (url) => new URL(url) } },
    "next/headers": { cookies: async () => ({ get: () => ({ value: encodeURIComponent(JSON.stringify(context)) }), delete: (name) => deleted.push(name) }) },
    "@/lib/supabase/server": { createClient: async () => supabase },
    "@/lib/oauth-redirect.mjs": redirects,
  };
  const exports = {};
  new Function("require", "exports", compiled)((id) => modules[id], exports);
  return { run: (origin = "http://localhost:3000") => exports.GET({ url: `${origin}/auth/callback?code=test` }), deleted, savedProfiles };
}

test("callback exchanges Google code then returns to original host and requested page", async () => {
  const harness = callbackHarness({ context: { mode: "login", next: "/student/portfolio?tab=projects" } });
  assert.equal((await harness.run()).href, "http://localhost:3000/student/portfolio?tab=projects");
  assert.deepEqual(harness.deleted, [redirects.OAUTH_CONTEXT_COOKIE]);
});

test("signup role survives an exact callback without query context", async () => {
  const harness = callbackHarness({ context: { mode: "signup", role: "academician" }, profileRole: null });
  assert.equal((await harness.run("https://portal.example.com")).href, "https://portal.example.com/academician");
  assert.equal(harness.savedProfiles[0].role, "academician");
});

test("unknown users select a role and failed OAuth stays on the initiating host", async () => {
  const newUser = callbackHarness({ context: { mode: "login" }, profileRole: null });
  assert.equal((await newUser.run()).pathname, "/select-role");
  const failed = callbackHarness({ context: { mode: "login" }, exchangeError: true });
  assert.equal((await failed.run()).href, "http://localhost:3000/login?error=auth_failed");
});
