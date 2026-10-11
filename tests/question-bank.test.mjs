import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createTestDatabase } from "./database-fixture.mjs";
test("reviewed bank enforces exact approval, private keys, independent review and immutable history", async () => {
  const db = await createTestDatabase();
  const owner = "11111111-1111-4111-8111-111111111111",
    reviewer = "22222222-2222-4222-8222-222222222222",
    student = "33333333-3333-4333-8333-333333333333",
    outsider = "44444444-4444-4444-8444-444444444444";
  const as = async (id) => {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec("set role authenticated");
  };
  try {
    for (const [id, role] of [
      [owner, "industry"],
      [reviewer, "academician"],
      [student, "student"],
      [outsider, "industry"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: "Local test" }],
      );
    await as(owner);
    const opportunity = (
      await db.query(
        "insert into opportunities(title,company,type,audience,location,work_mode,duration,deadline,skills,description,seats) values('SQL opening','Test only','Internship','student','Remote','Remote','3 months',current_date+30,array['SQL'],'SQL requirements for disposable local testing.',2) returning id",
      )
    ).rows[0].id;
    const question = {
      question: "Which keyword reads rows from a table?",
      options: ["SELECT", "DROP", "DELETE", "ALTER"],
      correctAnswer: 0,
      explanation:
        "SELECT retrieves the rows while the other commands change schema or data.",
      skillArea: "SQL",
      category: "Technical",
    };
    const definition = {
      opportunity_id: opportunity,
      title: "SQL role assessment",
      summary: "An employer-defined test of SQL fundamentals.",
      passing_score: 70,
      publish: true,
      questions: [question],
    };
    const save = async (d) =>
      (await db.query("select save_industry_assessment($1) id", [d])).rows[0]
        .id;
    const historical = await save(definition);
    await db.exec("reset role");
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202609240023_reviewed_question_bank.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await as(owner);
    await assert.rejects(
      save(definition),
      /independent question-bank approval/,
    );
    const draft = await save({ ...definition, publish: false });
    assert.equal(
      (await db.query("select submit_question_bank($1) n", [draft])).rows[0].n,
      1,
    );
    assert.equal(
      (await db.query("select submit_question_bank($1) n", [draft])).rows[0].n,
      0,
    );
    const list = async () =>
      (await db.query("select question_bank_items() items")).rows[0].items;
    const item = (await list())[0].id;
    await assert.rejects(
      db.query("insert into private.question_reviewers values($1)", [owner]),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select review_bank_question($1,'Approved','Independently checked the question and all answer options')",
        [item],
      ),
      /Provisioned/,
    );
    await db.exec("reset role");
    await db.query("insert into private.question_reviewers values($1),($2)", [
      owner,
      reviewer,
    ]);
    await as(owner);
    await assert.rejects(
      db.query(
        "select review_bank_question($1,'Approved','Independently checked the question and all answer options')",
        [item],
      ),
      /own question/,
    );
    for (const user of [student, outsider]) {
      await as(user);
      assert.deepEqual(await list(), []);
      await assert.rejects(
        db.query("select * from private.reviewed_questions"),
        /permission denied/,
      );
      await assert.rejects(
        db.query("select submit_question_bank($1)", [draft]),
        /Industry author|own assessment/,
      );
    }
    await as(reviewer);
    assert.equal((await list())[0].question.correctAnswer, 0);
    await assert.rejects(
      db.query("select review_bank_question($1,'Approved','yes')", [item]),
      /20/,
    );
    await db.query(
      "select review_bank_question($1,'Approved','Independently solved; key and alternatives are correct and relevant')",
      [item],
    );
    await assert.rejects(
      db.query(
        "select review_bank_question($1,'Rejected','A repeated review is not allowed for approved items')",
        [item],
      ),
      /transition/,
    );
    await as(owner);
    await assert.rejects(
      save({
        ...definition,
        id: draft,
        questions: [{ ...question, correctAnswer: 1 }],
      }),
      /independent question-bank approval/,
    );
    assert.equal(
      (
        await db.query("select status from industry_assessments where id=$1", [
          draft,
        ])
      ).rows[0].status,
      "Draft",
    );
    const published = await save({ ...definition, id: draft });
    await assert.rejects(save({ ...definition, id: published }), /immutable/);
    await as(student);
    const attempt = (
      await db.query("select start_industry_assessment($1) value", [published])
    ).rows[0].value;
    assert.equal(attempt.questions[0].correctAnswer, undefined);
    assert.equal(attempt.questions[0].explanation, undefined);
    await db.query("select start_industry_assessment($1)", [historical]);
    await as(reviewer);
    await db.query(
      "select review_bank_question($1,'Revoked','Question requires a better practical scenario before further reuse')",
      [item],
    );
    assert.equal((await list())[0].history.length, 3);
    await assert.rejects(
      db.query("delete from private.question_review_events"),
      /permission denied/,
    );
    await as(owner);
    await assert.rejects(
      save({ ...definition, supersedes: published }),
      /independent question-bank approval/,
    );
    assert.equal(
      (
        await db.query("select status from industry_assessments where id=$1", [
          published,
        ])
      ).rows[0].status,
      "Published",
    );
    assert.equal(
      (await db.query("select submit_question_bank($1) n", [published])).rows[0]
        .n,
      1,
    );
  } finally {
    await db.close();
  }
});
