import test from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "./database-fixture.mjs";
import { sessionCalendar } from "../lib/interview-calendar.mjs";
test("session calendar is private, UTC-based and escapes event text", () => {
  const s = {
    id: "11111111-1111-4111-8111-111111111111",
    status: "Scheduled",
    starts_at: "2026-09-22T15:30:00+05:30",
    ends_at: "2026-09-22T16:30:00+05:30",
    title: "Workshop\nATTENDEE:injected",
    kind: "Workshop",
    speaker: "Speaker",
    agenda: "Prepare questions.",
  };
  const text = sessionCalendar(s, "Private room").replace(/\r\n /g, "");
  assert.match(text, /DTSTART:20260922T100000Z/);
  assert.ok(!text.includes("\r\nATTENDEE:"));
  assert.match(text, /CLASS:PRIVATE/);
  assert.throws(() => sessionCalendar({ ...s, status: "Cancelled" }, "Room"));
});
test("sessions enforce capacity, audience, private meeting access, attendance, feedback and institution scope", async () => {
  const db = await createTestDatabase(),
    ids = {
      owner: "11111111-1111-4111-8111-111111111111",
      student: "22222222-2222-4222-8222-222222222222",
      other: "33333333-3333-4333-8333-333333333333",
      faculty: "44444444-4444-4444-8444-444444444444",
      institution: "55555555-5555-4555-8555-555555555555",
    };
  async function as(name) {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.role','authenticated',false)",
      [ids[name]],
    );
    await db.exec("set role authenticated");
  }
  const payload = {
    title: "Industry design workshop",
    kind: "Workshop",
    audience: "student",
    speaker: "Industry speaker",
    agenda: "Discuss practical design methods and prepare a small exercise.",
    mode: "Online",
    location: "PRIVATE meeting details",
    starts_at: new Date(Date.now() + 86400000).toISOString(),
    ends_at: new Date(Date.now() + 90000000).toISOString(),
    registration_closes_at: new Date(Date.now() + 80000000).toISOString(),
    capacity: 1,
  };
  const schedule = async (p = payload) =>
    (await db.query("select schedule_learning_session($1) id", [p])).rows[0].id;
  const register = (id, joining = true) =>
    db.query("select register_learning_session($1,$2)", [id, joining]);
  try {
    for (const [name, role] of [
      ["owner", "industry"],
      ["student", "student"],
      ["other", "student"],
      ["faculty", "academician"],
      ["institution", "institution"],
    ])
      await db.query(
        "insert into auth.users(id,email,raw_user_meta_data) values($1,$2,$3)",
        [ids[name], name + "@example.test", { role, full_name: name }],
      );
    await as("student");
    await assert.rejects(schedule(), /Organizer access/);
    await as("owner");
    const session = await schedule();
    await assert.rejects(
      schedule({ ...payload, program_id: ids.other }),
      /your open program/,
    );
    await as("faculty");
    await assert.rejects(register(session), /Audience/);
    assert.equal(
      (await db.query("select * from learning_session_access")).rows.length,
      0,
    );
    await as("student");
    await register(session);
    await register(session);
    assert.equal(
      (await db.query("select * from learning_session_registrations")).rows
        .length,
      1,
    );
    assert.equal(
      (await db.query("select * from learning_session_access")).rows[0]
        .location,
      "PRIVATE meeting details",
    );
    let registration = (
      await db.query("select * from learning_session_registrations")
    ).rows[0].id;
    await assert.rejects(
      db.query(
        "update learning_session_registrations set attendance='Present' where id=$1",
        [registration],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        "select submit_session_feedback($1,5,'Great practical session')",
        [registration],
      ),
      /recorded attendance/,
    );
    await as("other");
    await assert.rejects(register(session), /full/);
    assert.equal(
      (await db.query("select * from learning_session_registrations")).rows
        .length,
      0,
    );
    await as("student");
    await register(session, false);
    assert.equal(
      (await db.query("select * from learning_session_access")).rows.length,
      0,
    );
    await register(session);
    await db.query(
      "insert into institution_memberships(institution_id,member_id) values($1,$2)",
      [ids.institution, ids.student],
    );
    await as("institution");
    await db.query(
      "update institution_memberships set status='Approved' where member_id=$1",
      [ids.student],
    );
    assert.equal(
      (await db.query("select * from learning_session_registrations")).rows
        .length,
      1,
    );
    assert.equal(
      (await db.query("select * from learning_session_access")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select record_session_attendance($1,'Present')", [
        registration,
      ]),
      /organizer/,
    );
    await as("owner");
    await assert.rejects(
      db.query("select record_session_attendance($1,'Present')", [
        registration,
      ]),
      /after the session starts/,
    );
    await assert.rejects(
      db.query("select finish_learning_session($1,'Completed')", [session]),
      /record all attendance/,
    );
    // Simulate elapsed time in this disposable test database only.
    await db.exec("reset role");
    await db.query(
      "update learning_sessions set starts_at=now()-interval '2 hours',ends_at=now()-interval '1 hour',registration_closes_at=now()-interval '3 hours' where id=$1",
      [session],
    );
    await as("owner");
    await assert.rejects(
      db.query("select finish_learning_session($1,'Completed')", [session]),
      /record all attendance/,
    );
    await db.query("select record_session_attendance($1,'Present')", [
      registration,
    ]);
    await assert.rejects(
      db.query("select finish_learning_session($1,'Cancelled')", [session]),
      /attendance is recorded/,
    );
    await db.query("select finish_learning_session($1,'Completed')", [session]);
    await assert.rejects(
      db.query("select record_session_attendance($1,'Absent')", [registration]),
      /organizer/,
    );
    await as("student");
    await db.query(
      "select submit_session_feedback($1,5,'Useful practical exercises and clear explanations')",
      [registration],
    );
    await assert.rejects(
      db.query(
        "select submit_session_feedback($1,4,'Attempt to replace feedback')",
        [registration],
      ),
      /already submitted/,
    );
    assert.equal(
      (await db.query("select * from skill_evidence")).rows.length,
      0,
    );
    assert.ok(
      (
        await db.query("select * from notifications where category='Sessions'")
      ).rows.some((n) => n.title.includes("completed")),
    );
    await as("institution");
    assert.equal(
      (await db.query("select rating from learning_session_registrations"))
        .rows[0].rating,
      5,
    );
    await db.query(
      "update institution_memberships set status='Declined' where member_id=$1",
      [ids.student],
    );
    assert.equal(
      (await db.query("select * from learning_session_registrations")).rows
        .length,
      0,
    );
    await as("owner");
    const cancelled = await schedule();
    await as("student");
    await register(cancelled);
    await as("owner");
    await db.query("select finish_learning_session($1,'Cancelled')", [
      cancelled,
    ]);
    await as("student");
    await assert.rejects(register(cancelled), /closed/);
    assert.ok(
      (
        await db.query("select * from notifications where category='Sessions'")
      ).rows.some((n) => n.title.includes("cancelled")),
    );
    await as("owner");
    await db.exec(
      "update profiles set organization='Workshop publisher' where id=auth.uid()",
    );
    const dates = (
      await db.query(
        "select (now() at time zone 'Asia/Kolkata')::date::text today, ((now() at time zone 'Asia/Kolkata')::date+7)::text ending",
      )
    ).rows[0];
    const program = (
      await db.query("select publish_learning_program($1) id", [
        {
          title: "Practical database training",
          format: "Workshop",
          level: "Intermediate",
          audience: "student",
          work_mode: "Remote",
          location: "Online classroom",
          duration: "One week",
          starts_on: dates.today,
          ends_on: dates.ending,
          deadline: dates.today,
          seats: 10,
          description:
            "Instructor-led practical training in database design and reliable queries.",
          skills: ["SQL"],
          outcomes: [
            "Write reliable database queries",
            "Evaluate query execution plans",
          ],
          curriculum: [
            "Session one: joins and aggregations",
            "Session two: query plans and tests",
          ],
          schedule: "Daily sessions with published times",
          prerequisites: "Basic relational database concepts",
          instructor: "Database engineering team",
          fee_terms: "Free; no payment required",
          credential_terms:
            "Participation acknowledgment only; no accreditation claim",
          completion_rules:
            "Submit a tested query portfolio for publisher review",
          contact: "training@example.test",
        },
      ])
    ).rows[0].id;
    await assert.rejects(
      schedule({ ...payload, program_id: program, audience: "all" }),
      /eligible audience/,
    );
    await assert.rejects(
      schedule({
        ...payload,
        program_id: program,
        starts_at: new Date(Date.now() + 10 * 86400000).toISOString(),
        ends_at: new Date(Date.now() + 10 * 86400000 + 3600000).toISOString(),
      }),
      /program dates/,
    );
    const linked = await schedule({ ...payload, program_id: program });
    await as("student");
    await assert.rejects(register(linked), /Enroll in the linked program/);
    await db.query("select enroll_learning_program($1,true)", [program]);
    await register(linked);
    assert.equal(
      (
        await db.query(
          "select status from learning_session_registrations where session_id=$1",
          [linked],
        )
      ).rows[0].status,
      "Registered",
    );
  } finally {
    await db.close();
  }
});
