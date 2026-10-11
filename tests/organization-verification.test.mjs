import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("organization verification requires explicitly provisioned independent reviewer and immutable history", async () => {
  const db = await createTestDatabase();
  const owner = "11111111-1111-4111-8111-111111111111",
    admin = "22222222-2222-4222-8222-222222222222",
    other = "33333333-3333-4333-8333-333333333333";
  const as = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  try {
    for (const [id, role] of [
      [owner, "industry"],
      [admin, "institution"],
      [other, "student"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: "Test account" }],
      );
    await as(owner);
    assert.equal(
      (await db.query("select is_platform_reviewer() allowed")).rows[0].allowed,
      false,
    );
    await assert.rejects(
      db.query("insert into private.platform_reviewers(user_id) values($1)", [
        owner,
      ]),
      /permission denied/,
    );
    const payload = {
      legal_name: "Organization identity",
      website: "https://example.test",
      evidence_url: "https://example.test/registry",
      explanation:
        "Official registration record and authority to represent this organization.",
    };
    const id = (
      await db.query("select request_organization_verification($1) id", [
        payload,
      ])
    ).rows[0].id;
    await assert.rejects(
      db.query("select request_organization_verification($1)", [payload]),
      /unique/,
    );
    await assert.rejects(
      db.query(
        "select review_organization($1,'Approved','Reviewed the official organization registry')",
        [id],
      ),
      /reviewer access/,
    );
    await db.exec("reset role");
    await db.query("insert into private.platform_reviewers values($1),($2)", [
      owner,
      admin,
    ]);
    await as(owner);
    await assert.rejects(
      db.query(
        "select review_organization($1,'Approved','Reviewed the official organization registry')",
        [id],
      ),
      /own organization/,
    );
    await as(other);
    assert.equal(
      (await db.query("select * from organization_verifications")).rows.length,
      0,
    );
    await as(admin);
    await db.query(
      "select review_organization($1,'Approved','Reviewed the official registry and representation evidence')",
      [id],
    );
    await as(other);
    assert.equal(
      (await db.query("select * from organization_verification_directory()"))
        .rows[0].status,
      "Approved",
    );
    assert.equal(
      (await db.query("select * from organization_review_events")).rows.length,
      0,
    );
    await as(admin);
    await db.query(
      "select review_organization($1,'Revoked','Representation evidence is no longer valid')",
      [id],
    );
    await as(owner);
    assert.equal(
      (await db.query("select * from organization_review_events")).rows.length,
      3,
    );
    await assert.rejects(
      db.query("delete from organization_review_events"),
      /permission denied/,
    );
    assert.equal(
      (await db.query("select * from organization_verification_directory()"))
        .rows[0].status,
      "Revoked",
    );
  } finally {
    await db.close();
  }
});
