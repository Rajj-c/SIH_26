import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import * as calendar from "../lib/interview-calendar.mjs";
const id = "11111111-1111-4111-8111-111111111111",
  app = "22222222-2222-4222-8222-222222222222";
const interview = {
  id,
  application_id: app,
  starts_at: "2026-09-22T15:30:00+05:30",
  duration_minutes: 45,
  mode: "Video",
  location: "https://example.test/meeting",
  instructions: "Bring your project notes.",
  status: "Scheduled",
  response: "Pending",
};
const opportunity = { title: "Engineer", company: "Company" };
const unfold = (text) => text.replace(/\r\n /g, "");
test("calendar keeps exact UTC time, duration, stable UID and safe private event properties", () => {
  const text = unfold(
    calendar.interviewCalendar({
      interview,
      opportunity,
      now: "2026-09-21T12:00:00Z",
    }),
  );
  assert.ok(text.includes("DTSTART:20260922T100000Z\r\n"));
  assert.ok(text.includes("DTEND:20260922T104500Z\r\n"));
  assert.ok(text.includes(`UID:interview-${id}@origin-point\r\n`));
  assert.ok(text.includes("CLASS:PRIVATE\r\n"));
  assert.ok(text.includes("STATUS:TENTATIVE\r\n"));
  assert.ok(!/^(ATTENDEE|ORGANIZER|METHOD|ATTACH|URL):/m.test(text));
  assert.ok(text.endsWith("END:VCALENDAR\r\n"));
});
test("calendar escaping prevents injected components and properties", () => {
  const text = unfold(
    calendar.interviewCalendar({
      interview: {
        ...interview,
        instructions:
          "Hello\r\nEND:VEVENT\nBEGIN:VEVENT\nATTENDEE:mailto:bad@example.test",
        location: "Room A; floor 2, east\\west",
      },
      opportunity,
    }),
  );
  assert.equal(
    text.split("\r\n").filter((l) => l === "BEGIN:VEVENT").length,
    1,
  );
  assert.equal(text.split("\r\n").filter((l) => l === "END:VEVENT").length, 1);
  assert.ok(!text.includes("\r\nATTENDEE:"));
  assert.ok(text.includes("LOCATION:Room A\\; floor 2\\, east\\\\west"));
});
test("calendar line folding preserves Unicode and limits UTF-8 octets", () => {
  const title = "हैदराबाद 👩🏽‍💻 ".repeat(30);
  const text = calendar.interviewCalendar({
    interview,
    opportunity: { ...opportunity, title },
  });
  for (const line of text.split("\r\n"))
    assert.ok(new TextEncoder().encode(line).length <= 75);
  assert.ok(unfold(text).includes(calendar.calendarText(title)));
  assert.ok(!text.includes("\uFFFD"));
});
test("calendar rejects invalid IDs, times, durations and cancelled schedules", () => {
  for (const change of [
    { id: "bad\r\nID" },
    { starts_at: "bad" },
    { duration_minutes: 0 },
    { duration_minutes: 481 },
    { duration_minutes: 15.5 },
    { status: "Cancelled" },
  ])
    assert.throws(() =>
      calendar.interviewCalendar({
        interview: { ...interview, ...change },
        opportunity,
      }),
    );
});
const compiled = ts.transpileModule(
  readFileSync(
    new URL(
      "../app/api/recruitment/interviews/[id]/calendar/route.ts",
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
  record = interview,
  application = {
    opportunity_id: "opportunity",
    status: "Interview Scheduled",
  },
  failed = false,
} = {}) {
  const queries = [],
    exports = {};
  const db = {
    auth: { getUser: async () => ({ data: { user } }) },
    from(table) {
      const q = { table, filters: [] };
      queries.push(q);
      const chain = {
        select() {
          return chain;
        },
        eq(...args) {
          q.filters.push(args);
          return chain;
        },
        maybeSingle: async () => ({
          data: failed
            ? null
            : table === "application_interviews"
              ? record
              : table === "applications"
                ? application
                : opportunity,
          error: failed ? { message: "SECRET database error" } : null,
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
              new Response(JSON.stringify(body), {
                status: options.status,
                headers: options.headers,
              }),
          },
        }
      : name.includes("interview-calendar")
        ? calendar
        : { createClient: async () => db },
  );
  return {
    queries,
    get: (requestId = id) =>
      exports.GET(new Request("http://localhost/calendar"), {
        params: Promise.resolve({ id: requestId }),
      }),
  };
}
test("calendar route authenticates, treats inaccessible records as unavailable and rejects stale schedules", async () => {
  const anonymous = harness({ user: null });
  assert.equal((await anonymous.get()).status, 401);
  assert.equal(anonymous.queries.length, 0);
  const malformed = harness();
  assert.equal((await malformed.get("not-an-id")).status, 404);
  assert.equal(malformed.queries.length, 0);
  assert.equal((await harness({ record: null }).get()).status, 404);
  assert.equal((await harness({ application: null }).get()).status, 404);
  assert.equal(
    (await harness({ record: { ...interview, status: "Cancelled" } }).get())
      .status,
    409,
  );
  assert.equal(
    (
      await harness({
        application: { opportunity_id: "opportunity", status: "Offered" },
      }).get()
    ).status,
    409,
  );
});
test("calendar route uses scoped lookups and attachment/no-store headers", async () => {
  const h = harness(),
    response = await h.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(
    response.headers.get("Content-Type"),
    "text/calendar; charset=utf-8",
  );
  assert.equal(
    response.headers.get("Content-Disposition"),
    `attachment; filename="interview-${id}.ics"`,
  );
  assert.deepEqual(
    h.queries.map((q) => q.filters),
    [[["id", id]], [["id", app]], [["id", "opportunity"]]],
  );
  assert.match(await response.text(), /BEGIN:VCALENDAR/);
});
test("calendar route does not leak database errors", async () => {
  const response = await harness({ failed: true }).get();
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("SECRET"));
});
