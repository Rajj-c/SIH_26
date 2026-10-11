import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("credential reviews enforce membership, version-specific decisions, privacy and immutable history", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111",
    institution = "22222222-2222-4222-8222-222222222222",
    other = "33333333-3333-4333-8333-333333333333";
  async function as(id) {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
      [id],
    );
    await db.exec("set role authenticated");
  }
  const request = (record) =>
    db.query("select request_credential_review($1,$2) id", [
      record,
      institution,
    ]);
  const decide = (id, decision) =>
    db.query("select decide_credential_review($1,$2,$3)", [
      id,
      decision,
      "Reviewed submitted evidence and recorded the decision.",
    ]);
  try {
    for (const [id, role] of [
      [student, "student"],
      [institution, "institution"],
      [other, "institution"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(student);
    const certificate = (
      await db.query(
        "insert into portfolio_records(kind,title,organization,url) values('certification','Course certificate','Issuer','https://example.test/evidence') returning id",
      )
    ).rows[0].id;
    await assert.rejects(request(certificate), /approved institution/);
    await db.query(
      "insert into institution_memberships(institution_id,member_id) values($1,$2)",
      [institution, student],
    );
    await as(institution);
    await db.query(
      "update institution_memberships set status='Approved' where member_id=$1",
      [student],
    );
    await as(student);
    const first = (await request(certificate)).rows[0].id;
    assert.equal((await request(certificate)).rows[0].id, first);
    await assert.rejects(decide(first, "Approved"), /Institution access/);
    await assert.rejects(
      db.query(
        "update credential_review_requests set status='Approved' where id=$1",
        [first],
      ),
      /permission denied/,
    );
    await as(other);
    assert.equal(
      (await db.query("select * from credential_review_details")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from credential_review_events")).rows.length,
      0,
    );
    await assert.rejects(
      decide(first, "Approved"),
      /assigned to your institution/,
    );
    await as(institution);
    await decide(first, "Approved");
    assert.equal(
      (
        await db.query(
          "select is_current from credential_review_details where id=$1",
          [first],
        )
      ).rows[0].is_current,
      true,
    );
    await as(student);
    assert.equal(
      (
        await db.query(
          "select verified_at from portfolio_records where id=$1",
          [certificate],
        )
      ).rows[0].verified_at,
      null,
    );
    assert.equal(
      (await db.query("select * from skill_evidence")).rows.length,
      0,
    );
    await db.query(
      "update portfolio_records set title='Corrected certificate' where id=$1",
      [certificate],
    );
    assert.equal(
      (
        await db.query(
          "select is_current from credential_review_details where id=$1",
          [first],
        )
      ).rows[0].is_current,
      false,
    );
    const second = (await request(certificate)).rows[0].id;
    assert.notEqual(second, first);
    await db.query(
      "update portfolio_records set description='New evidence detail' where id=$1",
      [certificate],
    );
    await as(institution);
    await assert.rejects(decide(second, "Approved"), /changed or was deleted/);
    await decide(first, "Revoked");
    await as(student);
    const third = (await request(certificate)).rows[0].id;
    assert.equal(
      (
        await db.query(
          "select status from credential_review_requests where id=$1",
          [second],
        )
      ).rows[0].status,
      "Superseded",
    );
    await as(institution);
    await decide(third, "Changes requested");
    await as(student);
    const fourth = (await request(certificate)).rows[0].id;
    await as(institution);
    await decide(fourth, "Approved");
    await db.query(
      "update institution_memberships set status='Declined' where member_id=$1",
      [student],
    );
    assert.equal(
      (await db.query("select * from credential_review_details")).rows.length,
      0,
    );
    await assert.rejects(decide(fourth, "Revoked"), /membership/);
    await as(student);
    assert.equal(
      (await db.query("select * from credential_review_requests")).rows.length,
      4,
    );
    await db.query("delete from portfolio_records where id=$1", [certificate]);
    const history = (
      await db.query("select * from credential_review_details where id=$1", [
        fourth,
      ])
    ).rows[0];
    assert.equal(history.record_id, null);
    assert.equal(history.is_current, false);
    assert.equal(history.snapshot.title, "Corrected certificate");
    await assert.rejects(
      db.exec("delete from credential_review_events"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
