import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createTestDatabase } from "./database-fixture.mjs";

test("student repair upgrades the older schema, preserves records, and refuses a repeat", async () => {
  const db = await createTestDatabase({ stopAfterLearningSessions: true });
  const sql = await readFile(new URL("../supabase/repairs/student-pages-20261013.sql", import.meta.url), "utf8");
  const student = "33333333-3333-4333-8333-333333333333";
  try {
    await db.query("insert into auth.users(id,email,raw_user_meta_data) values($1,'student@example.test',$2)", [student, { role: "student", full_name: "Existing student" }]);
    const before = (await db.query("select * from profiles where id=$1", [student])).rows;
    await db.exec(sql);
    assert.deepEqual((await db.query("select * from profiles where id=$1", [student])).rows, before);
    const tables = ['learning_tracks','collaboration_members','collaboration_files','initiatives','initiative_entries','initiative_journal','roster_invitations'];
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [student]);
    await db.exec("set role authenticated");
    for (const table of tables) {
      assert.deepEqual((await db.query(`select * from public.${table}`)).rows, []);
    }
    await db.exec("reset role");
    const security = await db.query("select relname, relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname=any($1)", [tables]);
    assert.equal(security.rows.length, tables.length);
    assert.ok(security.rows.every(row => row.relrowsecurity));
    await assert.rejects(db.exec(sql), /already exists/);
    await db.exec("rollback");
    assert.deepEqual((await db.query("select * from profiles where id=$1", [student])).rows, before);
  } finally {
    await db.close();
  }
});
