import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as calendar from "../lib/interview-calendar.mjs";

const id = "11111111-1111-4111-8111-111111111111";
const compiled = ts.transpileModule(
  readFileSync(
    new URL(
      "../app/api/learning-sessions/[id]/calendar/route.ts",
      import.meta.url,
    ),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function harness({
  user = { id: "viewer" },
  status = "Scheduled",
  access = true,
  failed = false,
} = {}) {
  const queries = [],
    exports = {};
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const query = { table, filters: [] };
      queries.push(query);
      const chain = {
        select() {
          return chain;
        },
        eq(...args) {
          query.filters.push(args);
          return chain;
        },
        maybeSingle: async () => ({
          error: failed ? { message: "SECRET database error" } : null,
          data:
            table === "learning_session_access"
              ? access
                ? { location: "PRIVATE room" }
                : null
              : {
                  id,
                  status,
                  title: "Industry workshop",
                  kind: "Workshop",
                  speaker: "Speaker",
                  agenda: "Practical exercises",
                  starts_at: "2026-09-22T10:00:00Z",
                  ends_at: "2026-09-22T11:00:00Z",
                },
        }),
      };
      return chain;
    },
  };
  new Function("exports", "require", compiled)(exports, (name) =>
    name === "next/server"
      ? {
          NextResponse: {
            json: (body, options) =>
              new Response(JSON.stringify(body), options),
          },
        }
      : name.includes("interview-calendar")
        ? calendar
        : { createClient: async () => db },
  );
  return {
    queries,
    get: (key = id) =>
      exports.GET(new Request("http://localhost/calendar"), {
        params: Promise.resolve({ id: key }),
      }),
  };
}

test("session calendar route requires authentication and private access, rejects cancellation and suppresses database errors", async () => {
  const anonymous = harness({ user: null });
  assert.equal((await anonymous.get()).status, 401);
  assert.equal(anonymous.queries.length, 0);
  assert.equal((await harness().get("invalid")).status, 404);
  const denied = await harness({ access: false }).get();
  assert.equal(denied.status, 403);
  assert.ok(!(await denied.text()).includes("PRIVATE room"));
  assert.equal((await harness({ status: "Cancelled" }).get()).status, 409);
  const error = await harness({ failed: true }).get();
  assert.equal(error.status, 503);
  assert.ok(!(await error.text()).includes("SECRET"));
  const allowed = harness(),
    response = await allowed.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(
    response.headers.get("Content-Type"),
    "text/calendar; charset=utf-8",
  );
  assert.deepEqual(
    allowed.queries.map((q) => q.filters),
    [[["id", id]], [["session_id", id]]],
  );
  assert.match(await response.text(), /LOCATION:PRIVATE room/);
});
