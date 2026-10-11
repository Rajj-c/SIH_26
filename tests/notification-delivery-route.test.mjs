import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import ts from "typescript";
const compiled = ts.transpileModule(
  readFileSync(
    new URL("../app/api/jobs/notification-delivery/route.ts", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
function harness({ configured = true, providerOK = true } = {}) {
  const secret = "test-secret-never-used-in-production-123456";
  const calls = [],
    requests = [],
    exports = {};
  const db = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      return {
        error: null,
        data:
          name === "claim_notification_emails"
            ? [
                {
                  job_id: "test-job",
                  lease: "test-lease",
                  payload: {
                    from: "sender@example.test",
                    to: ["learner@example.test"],
                    subject: "Generic notice",
                    text: "Open your inbox",
                  },
                },
              ]
            : null,
      };
    },
  };
  new Function("exports", "require", "process", "fetch", compiled)(
    exports,
    (name) =>
      name === "next/server"
        ? {
            NextResponse: {
              json: (body, options) => ({
                body,
                status: options.status ?? 200,
              }),
            },
          }
        : name === "node:crypto"
          ? { timingSafeEqual }
          : { createAdminClient: () => db },
    {
      env: {
        NOTIFICATION_JOB_SECRET: secret,
        ...(configured
          ? {
              RESEND_API_KEY: "test-key",
              RESEND_FROM_EMAIL: "sender@example.test",
              NEXT_PUBLIC_APP_URL: "https://portal.example.test",
            }
          : {}),
      },
    },
    async (url, options) => {
      requests.push({ url, options });
      return { ok: providerOK };
    },
  );
  return {
    calls,
    requests,
    run: (authorized = true) =>
      exports.POST(
        new Request(
          "https://portal.example.test/api/jobs/notification-delivery",
          {
            method: "POST",
            headers: authorized ? { Authorization: `Bearer ${secret}` } : {},
          },
        ),
      ),
  };
}
test("email worker rejects unauthorized and unconfigured calls before claiming jobs", async () => {
  const h = harness();
  assert.equal((await h.run(false)).status, 401);
  assert.equal(h.calls.length, 0);
  assert.equal(h.requests.length, 0);
  const missing = harness({ configured: false });
  assert.equal((await missing.run()).status, 503);
  assert.equal(missing.calls.length, 0);
});
test("email worker sends stored payload with stable provider key and acknowledges actual provider acceptance", async () => {
  const h = harness();
  const r = await h.run();
  assert.equal(r.body.acceptedByProvider, 1);
  assert.equal(
    h.requests[0].options.headers["Idempotency-Key"],
    "origin-notification/test-job",
  );
  assert.deepEqual(h.calls[1], {
    name: "finish_notification_email",
    args: { job: "test-job", lease: "test-lease", delivered: true },
  });
  const failed = harness({ providerOK: false });
  assert.equal((await failed.run()).body.retryPending, 1);
  assert.equal(failed.calls[1].args.delivered, false);
});
