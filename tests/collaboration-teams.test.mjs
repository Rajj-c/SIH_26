import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("project invitations require both principals and consent; contributors cannot approve outcomes and revoked members lose files", async () => {
  const db = await createTestDatabase();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222",
    c = "33333333-3333-4333-8333-333333333333",
    observer = "44444444-4444-4444-8444-444444444444";
  const as = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  try {
    for (const [id, role] of [
      [a, "industry"],
      [b, "academician"],
      [c, "student"],
      [observer, "student"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(a);
    const opportunity = (
      await db.query(
        "insert into opportunities(title,company,type,audience,location,work_mode,duration,deadline,description,seats) values('Energy project','Industry','Research','academician','Online','Remote','Six weeks',current_date+30,'An applied industrial research collaboration',2) returning id",
      )
    ).rows[0].id;
    await as(b);
    const p = (
      await db.query(
        "select submit_collaboration_proposal($1,'Build a reproducible energy forecasting methodology','Deliver a tested model and evaluation','Six weeks with weekly reviews','Faculty time and public datasets','Public data only; no automatic transfer of IP rights') id",
        [opportunity],
      )
    ).rows[0].id;
    await as(a);
    await db.query(
      "select decide_collaboration_proposal($1,'Accepted','Accept the documented research proposal')",
      [p],
    );
    await db.query("select invite_collaboration_member($1,$2,'Contributor')", [
      p,
      c,
    ]);
    const invitation = (await db.query("select id from collaboration_members"))
      .rows[0].id;
    await assert.rejects(
      db.query("select respond_collaboration_invitation($1,'Approve')", [
        invitation,
      ]),
      /not permitted/,
    );
    await as(c);
    assert.equal(
      (await db.query("select * from collaboration_proposals")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select respond_collaboration_invitation($1,'Accept')", [
        invitation,
      ]),
      /not permitted/,
    );
    await as(b);
    await db.query("select respond_collaboration_invitation($1,'Approve')", [
      invitation,
    ]);
    await as(c);
    assert.equal(
      (await db.query("select * from collaboration_proposals")).rows.length,
      0,
    );
    await db.query("select respond_collaboration_invitation($1,'Accept')", [
      invitation,
    ]);
    assert.equal(
      (await db.query("select * from collaboration_proposals")).rows.length,
      1,
    );
    await db.query(
      "select post_team_update($1,'Completed the initial project investigation','https://example.test/evidence')",
      [p],
    );
    await assert.rejects(
      db.query(
        "select add_collaboration_milestone($1,'Fake approval','Unrelated scope that cannot be authorized',current_date+3)",
        [p],
      ),
      /Only the opportunity owner/,
    );
    const path = `${c}/${p}/report.pdf`;
    await db.query(
      "insert into storage.objects(bucket_id,name) values('collaboration-files',$1)",
      [path],
    );
    await db.query(
      "select register_collaboration_file($1,'Investigation report',$2)",
      [p, path],
    );
    assert.equal(
      (
        await db.query(
          "select * from storage.objects where bucket_id='collaboration-files'",
        )
      ).rows.length,
      1,
    );
    await as(a);
    await db.query("select respond_collaboration_invitation($1,'Revoke')", [
      invitation,
    ]);
    await as(c);
    assert.equal(
      (await db.query("select * from collaboration_proposals")).rows.length,
      0,
    );
    assert.equal(
      (await db.query("select * from collaboration_files")).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from storage.objects where bucket_id='collaboration-files'",
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "select post_team_update($1,'Attempt a revoked team update','')",
        [p],
      ),
      /contributor/,
    );
    await db.query(
      "delete from storage.objects where bucket_id='collaboration-files' and name=$1",
      [path],
    );
    await as(a);
    assert.equal(
      (
        await db.query(
          "select * from storage.objects where bucket_id='collaboration-files' and name=$1",
          [path],
        )
      ).rows.length,
      1,
    );
    await db.query("select invite_collaboration_member($1,$2,'Observer')", [
      p,
      observer,
    ]);
    const viewerInvite = (
      await db.query(
        "select id from collaboration_members where member_id=$1",
        [observer],
      )
    ).rows[0].id;
    await as(b);
    await db.query("select respond_collaboration_invitation($1,'Approve')", [
      viewerInvite,
    ]);
    await as(observer);
    await db.query("select respond_collaboration_invitation($1,'Accept')", [
      viewerInvite,
    ]);
    assert.equal(
      (await db.query("select * from collaboration_proposals")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "select post_team_update($1,'Observers must not post project updates','')",
        [p],
      ),
      /contributor/,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('collaboration-files',$1)",
        [`${observer}/${p}/forbidden.pdf`],
      ),
      /row-level security/,
    );
  } finally {
    await db.close();
  }
});
