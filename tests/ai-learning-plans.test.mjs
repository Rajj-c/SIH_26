import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
import { validatePlan } from "../lib/ai/learning-planner.mjs";
test("planner validates real resources, unique skills and weekly effort", () => {
  const context = {
    gaps: [{ skill: "React" }, { skill: "Python" }],
    resources: [{ id: "resource", skills: ["React.js"] }],
    weeks: 2,
    weekly_hours: 5,
  };
  const step = {
    skill: "React",
    week: 1,
    hours: 3,
    task: "Build a small component and attach a test report.",
    resource_id: "resource",
  };
  assert.deepEqual(validatePlan([step], context), [step]);
  for (const input of [
    [{ ...step, resource_id: "fake" }],
    [{ ...step, skill: "Invented" }],
    [{ ...step, week: 3 }],
    [{ ...step, hours: 6 }],
    [step, step],
    [step, { ...step, skill: "Python", resource_id: null }],
  ])
    assert.throws(() => validatePlan(input, context));
  assert.equal(
    validatePlan([{ ...step, resource_id: null }], context)[0].resource_id,
    null,
  );
});
test("AI plans enforce private drafts, atomic duplicate protection, idempotent approval and unverified goals", async () => {
  const db = await createTestDatabase();
  const student = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222",
    employer = "33333333-3333-4333-8333-333333333333";
  async function as(id) {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
      [id],
    );
    await db.exec("set role authenticated");
  }
  try {
    for (const [id, role] of [
      [student, "student"],
      [other, "student"],
      [employer, "industry"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [id, id + "@example.test", { role, full_name: role }],
      );
    await as(employer);
    const target = (
      await db.query(
        "insert into opportunities(title,company,type,location,work_mode,duration,deadline,skills,description,seats) values('Developer','Company','Job','Remote','Remote','Full time',current_date+90,array['React','Python'],'Develop and test applications with the team',5) returning id",
      )
    ).rows[0].id;
    await as(student);
    const steps = [
      {
        skill: "React",
        week: 1,
        hours: 3,
        task: "Build and test a component with clear evidence.",
        resource_id: null,
      },
    ];
    async function plan() {
      return (
        await db.query(
          "insert into ai_learning_plans(target_id,target_date,weekly_hours,model,prompt_version,draft) values($1,current_date+30,5,'test-model','test-v1',$2) returning id",
          [target, JSON.stringify(steps)],
        )
      ).rows[0].id;
    }
    const id = await plan();
    await as(other);
    assert.equal(
      (await db.query("select * from ai_learning_plans")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select accept_ai_learning_plan($1,$2)", [
        id,
        JSON.stringify(steps),
      ]),
      /own learning plan/,
    );
    await as(student);
    await assert.rejects(
      db.query("update ai_learning_plans set accepted_at=now() where id=$1", [
        id,
      ]),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select accept_ai_learning_plan($1,$2)", [
        id,
        JSON.stringify([{ ...steps[0], resource_id: target }]),
      ]),
      /unavailable or unrelated/,
    );
    await assert.rejects(
      db.query("select accept_ai_learning_plan($1,$2)", [
        id,
        JSON.stringify([steps[0], { ...steps[0], skill: "Python" }]),
      ]),
      /Weekly hours/,
    );
    const saved = (
      await db.query("select accept_ai_learning_plan($1,$2) ids", [
        id,
        JSON.stringify(steps),
      ])
    ).rows[0].ids;
    assert.equal(saved.length, 1);
    assert.deepEqual(
      (await db.query("select accept_ai_learning_plan($1,$2) ids", [id, "[]"]))
        .rows[0].ids,
      saved,
    );
    assert.equal(
      (await db.query("select * from learning_goals")).rows[0].status,
      "Planned",
    );
    assert.equal(
      (await db.query("select * from skill_evidence")).rows.length,
      0,
    );
    const second = await plan();
    await assert.rejects(
      db.query("select accept_ai_learning_plan($1,$2)", [
        second,
        JSON.stringify([{ ...steps[0], skill: "Python", hours: 1 }, steps[0]]),
      ]),
      /unique/,
    );
    assert.equal(
      (await db.query("select * from learning_goals")).rows.length,
      1,
      "failed batch creates no partial goals",
    );
    assert.equal(
      (
        await db.query(
          "select accepted_at from ai_learning_plans where id=$1",
          [second],
        )
      ).rows[0].accepted_at,
      null,
    );
    await as(employer);
    await assert.rejects(plan(), /row-level security/);
  } finally {
    await db.close();
  }
});
