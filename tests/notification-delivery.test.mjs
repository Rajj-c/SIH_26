import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("notification email queue is opt-in, service-only, leased and deduplicated; opt-out prevents retry", async () => {
  const db = await createTestDatabase(),
    id = "11111111-1111-4111-8111-111111111111";
  try {
    await db.query(
      'insert into auth.users(id,email,raw_user_meta_data) values($1,\'learner@example.test\',\'{"role":"student","full_name":"Learner"}\')',
      [id],
    );
    await db.query(
      "insert into notifications(recipient_id,category,title,href,event_key) values($1,'Private','SECRET private notice','/student/notifications','test')",
      [id],
    );
    await db.exec("set role service_role");
    assert.equal(
      (
        await db.query(
          "select * from claim_notification_emails('https://portal.example.test','mail@example.test')",
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
    await assert.rejects(
      db.query(
        "select * from claim_notification_emails('https://portal.example.test','mail@example.test')",
      ),
      /permission denied/,
    );
    await db.query(
      "insert into notification_email_preferences(user_id,enabled) values($1,true)",
      [id],
    );
    await db.exec("reset role;set role service_role");
    const jobs = (
      await db.query(
        "select * from claim_notification_emails('https://portal.example.test','mail@example.test')",
      )
    ).rows;
    assert.equal(jobs.length, 1);
    assert.ok(!JSON.stringify(jobs[0].payload).includes("SECRET"));
    assert.deepEqual(jobs[0].payload.to, ["learner@example.test"]);
    assert.equal(
      (
        await db.query(
          "select * from claim_notification_emails('https://portal.example.test','mail@example.test')",
        )
      ).rows.length,
      0,
    );
    await db.query("select finish_notification_email($1,$2,false)", [
      jobs[0].job_id,
      jobs[0].lease,
    ]);
    await db.exec(
      "reset role;update private.notification_email_jobs set lease_until=now()-interval '1 minute';set role authenticated",
    );
    await db.exec("update notification_email_preferences set enabled=false");
    await db.exec("reset role;set role service_role");
    assert.equal(
      (
        await db.query(
          "select * from claim_notification_emails('https://portal.example.test','mail@example.test')",
        )
      ).rows.length,
      0,
    );
    await db.exec("reset role;set role authenticated");
    await db.exec("update notification_email_preferences set enabled=true");
    await db.exec("reset role;set role service_role");
    const retry = (
      await db.query(
        "select * from claim_notification_emails('https://portal.example.test','mail@example.test')",
      )
    ).rows[0];
    assert.equal(retry.job_id, jobs[0].job_id);
    assert.notEqual(retry.lease, jobs[0].lease);
    assert.deepEqual(retry.payload, jobs[0].payload);
    await db.query("select finish_notification_email($1,$2,true)", [
      retry.job_id,
      retry.lease,
    ]);
    assert.equal(
      (
        await db.query(
          "select * from claim_notification_emails('https://portal.example.test','mail@example.test')",
        )
      ).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
