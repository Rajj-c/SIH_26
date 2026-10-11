import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as pagination from "../lib/notification-pagination.mjs";
const id = "11111111-1111-4111-8111-111111111111";
const cursor = { id, created_at: "2026-10-07T10:30:00.123456+00:00" };
const url = (value) =>
  `http://localhost/api/notifications?cursor=${encodeURIComponent(JSON.stringify(value))}&unread=true`;

test("cursor retains microsecond ordering and rejects filter injection", () => {
  assert.deepEqual(pagination.parseNotificationQuery(url(cursor)), {
    cursor,
    unreadOnly: true,
  });
  for (const value of [
    null,
    [],
    {},
    { ...cursor, id: `${id},recipient_id.neq.x` },
    { ...cursor, created_at: "now()" },
    { ...cursor, created_at: "2026-10-07T00:00:00Z),id.gt.x" },
  ])
    assert.throws(
      () => pagination.parseNotificationQuery(url(value)),
      /Invalid/,
    );
  assert.throws(() =>
    pagination.parseNotificationQuery("http://localhost/?unread=yes"),
  );
  assert.throws(() =>
    pagination.parseNotificationQuery("http://localhost/?cursor=%7B"),
  );
});
test("pagination uses one lookahead row, preserves order and handles final/empty pages", () => {
  const rows = Array.from({ length: 101 }, (_, i) => ({
    ...cursor,
    title: String(i),
  }));
  const page = pagination.notificationPage(rows);
  assert.equal(page.items.length, 100);
  assert.equal(page.items.at(-1).title, "99");
  assert.deepEqual(JSON.parse(page.nextCursor), cursor);
  assert.equal(
    pagination.notificationPage(rows.slice(0, 100)).nextCursor,
    null,
  );
  assert.deepEqual(pagination.notificationPage([]), {
    items: [],
    nextCursor: null,
  });
});

const compiled = ts.transpileModule(
  readFileSync(
    new URL("../app/api/notifications/route.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
function harness({ user = { id: "viewer" }, failure = false } = {}) {
  const calls = [],
    exports = {};
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const query = { table, operations: [] };
      calls.push(query);
      const chain = {};
      for (const method of ["select", "eq", "order", "limit", "is", "or"])
        chain[method] = (...args) => {
          query.operations.push([method, ...args]);
          return chain;
        };
      chain.then = (resolve, reject) =>
        Promise.resolve({
          data: [],
          count: 7,
          error: failure ? { message: "PRIVATE DATABASE ERROR" } : null,
        }).then(resolve, reject);
      return chain;
    },
  };
  new Function("exports", "require", compiled)(exports, (name) => {
    if (name === "next/server")
      return {
        NextResponse: {
          json: (body, opts) => new Response(JSON.stringify(body), opts),
        },
      };
    if (name.includes("notification-pagination")) return pagination;
    return { createClient: async () => db };
  });
  return {
    calls,
    get: (path = "http://localhost/api/notifications") =>
      exports.GET(new Request(path)),
  };
}
test("notification API gates authentication and validates filters before querying", async () => {
  const anon = harness({ user: null });
  assert.equal((await anon.get()).status, 401);
  assert.equal(anon.calls.length, 0);
  const bad = harness();
  assert.equal((await bad.get("http://localhost/?cursor=invalid")).status, 400);
  assert.equal(bad.calls.length, 0);
});
test("notification API scopes both queries to recipient and applies unread/cursor filters", async () => {
  const h = harness();
  const response = await h.get(url(cursor));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal((await response.json()).unread, 7);
  for (const query of h.calls)
    assert.ok(
      query.operations.some(
        (op) =>
          JSON.stringify(op) ===
          JSON.stringify(["eq", "recipient_id", "viewer"]),
      ),
    );
  assert.ok(
    h.calls[0].operations.some((op) => op[0] === "limit" && op[1] === 101),
  );
  assert.ok(
    h.calls[0].operations.some((op) => op[0] === "is" && op[1] === "read_at"),
  );
  assert.ok(
    h.calls[0].operations.some(
      (op) =>
        op[0] === "or" &&
        op[1] ===
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${id})`,
    ),
  );
  const error = await harness({ failure: true }).get();
  assert.equal(error.status, 503);
  assert.ok(!(await error.text()).includes("PRIVATE DATABASE ERROR"));
});
