import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
import { parseRosterCSV } from "../lib/roster-import.mjs";
test("roster CSV validates all rows and removes duplicates before saving", () => {
  assert.deepEqual(
    parseRosterCSV("email\nPerson@example.test\nperson@example.test\n"),
    { emails: ["person@example.test"], duplicates: 1 },
  );
  assert.throws(() => parseRosterCSV("email,name\na@example.test,Person"));
  assert.throws(() => parseRosterCSV("email\nvalid@example.test\ninvalid"));
});
test("challenges and mentorship enforce judging time, private entries and two-party completion; roster invitations require recipient consent", async () => {
  const db = await createTestDatabase();
  const owner = "11111111-1111-4111-8111-111111111111",
    learner = "22222222-2222-4222-8222-222222222222",
    other = "33333333-3333-4333-8333-333333333333",
    institution = "44444444-4444-4444-8444-444444444444";
  const as = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  const payload = {
    kind: "Mentorship",
    title: "Applied engineering mentorship",
    description:
      "Develop practical engineering skills through weekly review and documented progress.",
    criteria:
      "Review a working project and the learner explanation against agreed project goals.",
    audience: "student",
    deadline: new Date(Date.now() + 86400000).toISOString(),
    capacity: 1,
  };
  try {
    for (const [id, role] of [
      [owner, "industry"],
      [learner, "student"],
      [other, "student"],
      [institution, "institution"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(owner);
    const id = (await db.query("select publish_initiative($1) id", [payload]))
      .rows[0].id;
    await as(learner);
    await db.query(
      "select submit_initiative_entry($1,'I want to build and document a working engineering project','')",
      [id],
    );
    const entry = (await db.query("select id from initiative_entries")).rows[0]
      .id;
    await assert.rejects(
      db.query(
        "select update_initiative_entry($1,'Accept','I cannot accept my own mentorship')",
        [entry],
      ),
      /Invalid mentorship/,
    );
    await as(other);
    assert.equal(
      (await db.query("select * from initiative_entries")).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "select submit_initiative_entry($1,'A second mentorship request beyond capacity','')",
        [id],
      ),
      /capacity/,
    );
    await as(owner);
    await db.query(
      "select update_initiative_entry($1,'Accept','I can support these practical goals')",
      [entry],
    );
    await assert.rejects(
      db.query(
        "select update_initiative_entry($1,'Complete','Cannot skip learner completion request')",
        [entry],
      ),
      /Invalid mentorship/,
    );
    await as(learner);
    await db.query(
      "select update_initiative_entry($1,'Progress','Completed the first project milestone')",
      [entry],
    );
    await db.query(
      "select update_initiative_entry($1,'Request completion','Project goals are achieved and documented')",
      [entry],
    );
    await as(owner);
    await db.query(
      "select update_initiative_entry($1,'Complete','Reviewed the documented project outcomes')",
      [entry],
    );
    const challenge = (
      await db.query("select publish_initiative($1) id", [
        { ...payload, kind: "Innovation challenge" },
      ])
    ).rows[0].id;
    await as(learner);
    await db.query(
      "select submit_initiative_entry($1,'Completed challenge submission with supporting evidence','https://example.test/work')",
      [challenge],
    );
    const submission = (
      await db.query(
        "select id from initiative_entries where initiative_id=$1",
        [challenge],
      )
    ).rows[0].id;
    await as(owner);
    await assert.rejects(
      db.query(
        "select update_initiative_entry($1,'Review','Judging cannot start before the deadline',80)",
        [submission],
      ),
      /judging/,
    );
    await db.exec("reset role");
    await db.query(
      "update initiatives set deadline=now()-interval '1 minute' where id=$1",
      [challenge],
    );
    await as(owner);
    await db.query(
      "select update_initiative_entry($1,'Review','The submission meets most stated criteria',80)",
      [submission],
    );
    await as(institution);
    await assert.rejects(
      db.query("select import_roster_invitations($1)", [
        [learner + "@example.test", "invalid"],
      ]),
      /Invalid email/,
    );
    assert.equal(
      (await db.query("select * from roster_invitations")).rows.length,
      0,
    );
    await db.query("select import_roster_invitations($1)", [
      [learner + "@example.test", learner + "@example.test"],
    ]);
    const invitation = (await db.query("select id from roster_invitations"))
      .rows[0].id;
    assert.equal(
      (await db.query("select * from institution_memberships")).rows.length,
      0,
    );
    await as(other);
    assert.equal(
      (await db.query("select * from roster_invitations")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select respond_roster_invitation($1,'Accept')", [invitation]),
      /not permitted/,
    );
    await as(learner);
    await db.query("select respond_roster_invitation($1,'Accept')", [
      invitation,
    ]);
    assert.equal(
      (await db.query("select status from institution_memberships")).rows[0]
        .status,
      "Approved",
    );
  } finally {
    await db.close();
  }
});
