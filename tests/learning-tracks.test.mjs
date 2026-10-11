import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
test("learning tracks enforce publisher ownership, content validation, immutable publication and archive visibility", async () => {
  const db = await createTestDatabase();
  const publisher = "11111111-1111-4111-8111-111111111111",
    learner = "22222222-2222-4222-8222-222222222222";
  const as = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  const payload = {
    title: "Database essentials",
    category: "Engineering",
    description: "A practical curriculum covering relational database design.",
    modules: [
      {
        id: "m1",
        title: "Relational design",
        description: "Learn how tables and relationships work",
        level: "beginner",
        subTopics: [
          { id: "t1", title: "Normal forms", duration: "30 minutes" },
        ],
      },
    ],
    resources: [
      {
        name: "Publisher handbook",
        description: "The publisher's study material for this module",
        url: "https://example.test/handbook",
      },
    ],
  };
  try {
    await db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values($1,'publisher@example.test',$2),($3,'student@example.test',$4)",
      [
        publisher,
        { role: "industry", full_name: "Publisher" },
        learner,
        { role: "student", full_name: "Learner" },
      ],
    );
    await as(learner);
    await assert.rejects(
      db.query("select publish_learning_track($1)", [payload]),
      /Publisher/,
    );
    await as(publisher);
    for (const invalid of [
      { modules: [] },
      {
        modules: [
          {
            ...payload.modules[0],
            title: { nested: "This must not render as a React child" },
          },
        ],
      },
      { resources: [] },
      { modules: [...payload.modules, ...payload.modules] },
      { resources: [{ ...payload.resources[0], url: "javascript:alert(1)" }] },
      { modules: [{ ...payload.modules[0], level: "invented" }] },
    ])
      await assert.rejects(
        db.query("select publish_learning_track($1)", [
          { ...payload, ...invalid },
        ]),
      );
    const id = (
      await db.query("select publish_learning_track($1) id", [payload])
    ).rows[0].id;
    await assert.rejects(
      db.query("update learning_tracks set title='Changed title' where id=$1", [
        id,
      ]),
      /permission denied/,
    );
    await as(learner);
    assert.equal(
      (await db.query("select * from learning_tracks")).rows.length,
      1,
    );
    await assert.rejects(
      db.query("select archive_learning_track($1)", [id]),
      /your published/,
    );
    await as(publisher);
    await db.query("select archive_learning_track($1)", [id]);
    assert.equal(
      (await db.query("select status from learning_tracks")).rows[0].status,
      "Archived",
    );
    await as(learner);
    assert.equal(
      (await db.query("select * from learning_tracks")).rows.length,
      0,
    );
  } finally {
    await db.close();
  }
});
