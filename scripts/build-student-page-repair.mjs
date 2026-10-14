import { readFile, mkdir, writeFile } from "node:fs/promises";

// Package existing migrations only; this script never connects to Supabase.
const migrations = [
  "202609220016_published_learning_tracks.sql",
  "202609220019_collaboration_teams.sql",
  "202609220020_challenges_mentorship.sql",
  "202609220021_roster_invitations.sql",
];
const preflight = `-- Repair the four student features confirmed missing on 2026-10-13.
-- Run once in the project owner's Supabase SQL Editor after reviewing a backup.
-- All four changes commit together. Existing student records are retained.
-- Stop if any target table already exists; inspect migration history first.
begin;
do $student_repair$
declare name text;
begin
  foreach name in array array['profiles','institution_memberships','collaboration_proposals','collaboration_milestones','collaboration_updates','collaboration_events','notifications'] loop
    if to_regclass('public.' || name) is null then
      raise exception 'Required base table % is missing. Apply the earlier migrations first.', name;
    end if;
  end loop;
  foreach name in array array['learning_tracks','collaboration_members','collaboration_files','initiatives','initiative_entries','initiative_journal','roster_invitations'] loop
    if to_regclass('public.' || name) is not null then
      raise exception 'Target table % already exists. Stop and review applied migrations before using this repair.', name;
    end if;
  end loop;
  if to_regprocedure('private.current_role()') is null
     or to_regprocedure('private.send_notification(uuid,text,text,text,text)') is null
     or to_regprocedure('private.collaboration_event(uuid,text,text)') is null then
    raise exception 'Required base functions are missing. Apply the earlier migrations first.';
  end if;
end $student_repair$;
`;
const parts = await Promise.all(migrations.map(async (name) => {
  const sql = await readFile(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
  if (!/^begin;\s/i.test(sql) || !/commit;\s*$/i.test(sql)) throw new Error(`Unexpected transaction wrapper: ${name}`);
  return `\n-- Source: ${name}\n${sql.replace(/^begin;\s*/i, "").replace(/commit;\s*$/i, "")}`;
}));
const output = new URL("../supabase/repairs/student-pages-20261013.sql", import.meta.url);
await mkdir(new URL("../supabase/repairs/", import.meta.url), { recursive: true });
await writeFile(output, `${preflight}${parts.join("\n")}\nnotify pgrst, 'reload schema';\ncommit;\n`);
console.log(`Prepared ${output.pathname}. No database changes were made.`);
