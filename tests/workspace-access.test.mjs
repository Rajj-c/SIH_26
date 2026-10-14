import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const compiled = ts.transpileModule(
  readFileSync(new URL("../middleware.js", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const roles = ["student", "industry", "academician", "institution"];

function harness({ signedIn = true, role = "student", failure = false } = {}) {
  const exports = {};
  const cookieStore = () => {
    const values = new Map();
    return {
      getAll: () => [...values.values()],
      set: (name, value, options) => {
        const cookie =
          typeof name === "object" ? name : { name, value, ...options };
        values.set(cookie.name, cookie);
      },
    };
  };
  const modules = {
    "@/lib/supabase/project-url.mjs": { normalizeSupabaseUrl: () => "https://test.supabase.co" },
    "next/server": {
      NextResponse: {
        next: () => ({ kind: "next", cookies: cookieStore() }),
        redirect: (url) => ({ kind: "redirect", url, cookies: cookieStore() }),
      },
    },
    "@supabase/ssr": {
      createServerClient: (_url, _key, { cookies }) => ({
        auth: {
          getUser: async () => {
            cookies.setAll([
              {
                name: "session",
                value: "test-only-refresh",
                options: { httpOnly: true },
              },
            ]);
            return { data: { user: signedIn ? { id: "test-account" } : null } };
          },
        },
        from: (table) => {
          assert.equal(table, "profiles");
          return {
            select: () => ({
              eq: (field, id) => {
                assert.equal(field, "id");
                assert.equal(id, "test-account");
                return {
                  maybeSingle: async () => {
                    if (failure) throw new Error("Database unavailable");
                    return { data: role ? { role } : null };
                  },
                };
              },
            }),
          };
        },
      }),
    },
  };
  new Function("require", "exports", compiled)((id) => modules[id], exports);
  return async (path) => {
    const url = new URL(path, "http://localhost:3000");
    return exports.middleware({
      nextUrl: url,
      url: url.href,
      headers: {},
      cookies: cookieStore(),
    });
  };
}

test("signed-out users cannot open any role workspace and refreshed cookies survive redirect", async () => {
  for (const role of roles) {
    const result = await harness({ signedIn: false })(`/${role}/notifications`);
    assert.equal(result.kind, "redirect");
    assert.equal(result.url.pathname, "/login");
    assert.equal(result.url.searchParams.get("next"), `/${role}/notifications`);
    assert.deepEqual(result.cookies.getAll(), [
      { name: "session", value: "test-only-refresh", httpOnly: true },
    ]);
  }
});

test("login retains the requested page query parameters", async () => {
  const result = await harness({ signedIn: false })("/student/portfolio?tab=projects");
  assert.equal(result.url.searchParams.get("next"), "/student/portfolio?tab=projects");
});

test("all four roles stay in their assigned workspace even on direct URL entry", async () => {
  for (const assigned of roles) {
    for (const requested of roles) {
      const result = await harness({ role: assigned })(`/${requested}/profile`);
      if (assigned === requested) assert.equal(result.kind, "next");
      else {
        assert.equal(result.kind, "redirect");
        assert.equal(result.url.pathname, `/${assigned}`);
      }
    }
  }
});

test("missing, invalid and unavailable role lookups fail closed; existing users leave login", async () => {
  for (const options of [
    { role: null },
    { role: "admin" },
    { failure: true },
  ]) {
    const result = await harness(options)("/student");
    assert.equal(result.kind, "redirect");
    assert.equal(result.url.pathname, "/select-role");
  }
  for (const role of roles) {
    const result = await harness({ role })("/login");
    assert.equal(result.url.pathname, `/${role}`);
  }
  assert.equal((await harness({ signedIn: false })("/")).kind, "next");
});
