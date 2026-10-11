import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("AI allowance is atomic, per-account, private and persists between requests", async () => {
  const db = await createTestDatabase(),
    id = "11111111-1111-4111-8111-111111111111";
  try {
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data) values($1,\'ai@example.test\',\'{"role":"student","full_name":"Learner"}\')',
      [id],
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select reserve_ai_request() wait")).rows[0].wait,
      0,
    );
    assert.ok(
      (await db.query("select reserve_ai_request() wait")).rows[0].wait > 0,
    );
    await assert.rejects(
      db.query("delete from private.ai_request_budgets"),
      /permission denied/,
    );
    await db.exec(
      "reset role; update private.ai_request_budgets set next_at=now()-interval '1 minute',used=30",
    );
    await db.exec("set role authenticated");
    assert.ok(
      (await db.query("select reserve_ai_request() wait")).rows[0].wait > 0,
    );
    await db.exec(
      "reset role; update private.ai_request_budgets set budget_day=current_date-1",
    );
    await db.exec("set role authenticated");
    assert.equal(
      (await db.query("select reserve_ai_request() wait")).rows[0].wait,
      0,
    );
  } finally {
    await db.close();
  }
});
