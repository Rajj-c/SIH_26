import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("credential notices are transactional, private, deduplicated and do not grant access", async () => {
  const db = await createTestDatabase(),
    student = "11111111-1111-4111-8111-111111111111",
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
  const notices = async () =>
    (
      await db.query(
        "select * from notifications where category='Credential review'",
      )
    ).rows;
  const request = async (record) =>
    (
      await db.query("select request_credential_review($1,$2) id", [
        record,
        institution,
      ])
    ).rows[0].id;
  const decide = (id, decision) =>
    db.query("select decide_credential_review($1,$2,$3)", [
      id,
      decision,
      "PRIVATE feedback about evidence.",
    ]);
  try {
    for (const [id, role] of [
      [student, "student"],
      [institution, "institution"],
      [other, "institution"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: "PRIVATE name" }],
      );
    await as(student);
    const record = (
      await db.query(
        "insert into portfolio_records(kind,title,organization,url) values('certification','PRIVATE title','PRIVATE issuer','https://example.test/evidence') returning id",
      )
    ).rows[0].id;
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
    await db.exec("begin");
    await request(record);
    await db.exec("rollback");
    await as(institution);
    assert.equal((await notices()).length, 0);
    await as(student);
    const id = await request(record);
    assert.equal(await request(record), id);
    assert.equal((await notices()).length, 0);
    await as(institution);
    let items = await notices();
    assert.equal(items.length, 1);
    assert.equal(items[0].href, "/institution/credential-reviews?review=" + id);
    assert.ok(!JSON.stringify(items).includes("PRIVATE"));
    const notice = items[0].id;
    await db.exec("begin");
    await decide(id, "Approved");
    await db.exec("rollback");
    await as(student);
    assert.equal((await notices()).length, 0);
    await as(other);
    assert.equal((await notices()).length, 0);
    await assert.rejects(decide(id, "Approved"), /assigned/);
    await db.query("select mark_notification_read($1)", [notice]);
    await as(institution);
    assert.equal((await notices())[0].read_at, null);
    await decide(id, "Changes requested");
    assert.equal((await notices()).length, 1);
    await as(student);
    items = await notices();
    assert.equal(items.length, 1);
    assert.equal(items[0].href, "/student/credential-reviews?review=" + id);
    assert.match(items[0].title, /Corrections/);
    assert.ok(!JSON.stringify(items).includes("PRIVATE"));
    const next = await request(record);
    await as(institution);
    await decide(next, "Approved");
    await decide(next, "Revoked");
    await as(student);
    items = await notices();
    assert.equal(items.length, 3);
    assert.ok(items.some((n) => n.title.includes("institution-reviewed")));
    assert.ok(items.some((n) => n.title.includes("revoked")));
    const third = await request(record);
    await as(institution);
    await decide(third, "Declined");
    await as(student);
    assert.ok((await notices()).some((n) => n.title.includes("declined")));
    const fourth = await request(record);
    await db.query(
      "update portfolio_records set description='Updated supporting details' where id=$1",
      [record],
    );
    const fifth = await request(record);
    assert.notEqual(fourth, fifth);
    await as(institution);
    assert.equal(
      (await notices()).length,
      5,
      "superseding does not create an extra notification",
    );
    await db.query(
      "update institution_memberships set status='Declined' where member_id=$1",
      [student],
    );
    assert.equal(
      (
        await db.query("select * from credential_review_details where id=$1", [
          fifth,
        ])
      ).rows.length,
      0,
    );
    await assert.rejects(decide(fifth, "Approved"), /membership/);
    await as(student);
    await assert.rejects(request(record), /approved institution/);
    await as(institution);
    assert.equal((await notices()).length, 5);
  } finally {
    await db.close();
  }
});
