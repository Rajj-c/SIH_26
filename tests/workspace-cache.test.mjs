import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { isWorkspaceCacheKey } from "../lib/workspace-cache.mjs";

const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/platform-store.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;

function harness() {
  let callback, cleanup;
  const calls = [];
  let unsubscribed = false;
  const exports = {};
  const modules = {
    swr: {
      mutate: async (...args) => {
        calls.push(args);
      },
    },
    react: {
      useEffect: (effect) => {
        cleanup = effect();
      },
    },
    "@/lib/supabase/client": {
      supabase: {
        auth: {
          onAuthStateChange: (fn) => {
            callback = fn;
            return {
              data: {
                subscription: {
                  unsubscribe: () => {
                    unsubscribed = true;
                  },
                },
              },
            };
          },
        },
      },
    },
    "@/lib/skill-taxonomy.mjs": {},
    "@/lib/workspace-cache.mjs": { isWorkspaceCacheKey },
  };
  new Function("require", "exports", compiled)((id) => {
    assert.ok(id in modules, `Unexpected dependency ${id}`);
    return modules[id];
  }, exports);
  return {
    exports,
    calls,
    emit: (event, id) => callback(event, id ? { user: { id } } : null),
    cleanup: () => cleanup(),
    unsubscribed: () => unsubscribed,
  };
}

test("account cleanup covers paginated inboxes, new modules and legacy question-bank keys", () => {
  for (const key of [
    "/api/platform",
    "/api/notifications?unread=true&cursor=x",
    "/api/question-bank",
    "question-bank",
    "/api/credential-reviews",
    "/api/future-workspace",
    ["/api/notifications", "account-a"],
  ])
    assert.equal(isWorkspaceCacheKey(key), true);
  for (const key of [
    null,
    undefined,
    1,
    {},
    [],
    "/apiary",
    "theme",
    "https://other.test/api/data",
  ])
    assert.equal(isWorkspaceCacheKey(key), false);
});

test("logout clears workspace caches without refetching private records", async () => {
  const h = harness();
  await h.exports.clearPlatformCache();
  assert.equal(h.calls.length, 1);
  const [filter, data, options] = h.calls[0];
  assert.equal(filter, isWorkspaceCacheKey);
  assert.equal(data, undefined);
  assert.deepEqual(options, { revalidate: false });
});

test("identity changes clear caches; token refreshes preserve the same account and listener cleans up", () => {
  const h = harness();
  h.exports.useAuthCacheBoundary();
  h.emit("INITIAL_SESSION", "student-a");
  h.emit("TOKEN_REFRESHED", "student-a");
  assert.equal(h.calls.length, 0);
  h.emit("SIGNED_IN", "industry-b");
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0][0], isWorkspaceCacheKey);
  assert.equal(h.calls[0][1], undefined);
  assert.deepEqual(h.calls[0][2], { revalidate: true });
  h.emit("SIGNED_OUT", null);
  assert.deepEqual(h.calls[1][2], { revalidate: false });
  h.emit("SIGNED_OUT", null);
  assert.equal(h.calls.length, 2);
  h.cleanup();
  assert.equal(h.unsubscribed(), true);
});
