import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
const manifest = JSON.parse(
  await readFile(
    new URL("../.demo-private/cohort.json", import.meta.url),
    "utf8",
  ),
);
if (manifest.project !== process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw new Error("Project mismatch");
const db = createClient(
  manifest.project,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);
const ids = Object.values(manifest.accounts).map((a) => a.id);
const get = async (q) => {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
};
const profiles = await get(db.from("profiles").select("id,role").in("id", ids));
const opportunities = await get(
  db.from("opportunities").select("id,type").in("owner_id", ids),
);
const applications = await get(
  db.from("applications").select("id,status").in("applicant_id", ids),
);
const members = await get(
  db.from("institution_memberships").select("id,status").in("member_id", ids),
);
const programs = await get(
  db.from("program_enrollments").select("id,status").in("learner_id", ids),
);
const internships = await get(
  db
    .from("internship_arrangements")
    .select("id,response")
    .in(
      "application_id",
      applications.map((a) => a.id),
    ),
);
const supervisors = await get(
  db
    .from("internship_supervisors")
    .select("id,status")
    .in("supervisor_id", ids),
);
const records = await get(
  db.from("portfolio_records").select("id,kind,verified_at").in("user_id", ids),
);
const tally = (rows, key) =>
  rows.reduce((a, r) => ((a[r[key]] = (a[r[key]] || 0) + 1), a), {});
const summary = {
  accounts: tally(profiles, "role"),
  opportunities: tally(opportunities, "type"),
  applications: tally(applications, "status"),
  memberships: tally(members, "status"),
  enrollments: tally(programs, "status"),
  internships: tally(internships, "response"),
  supervision: tally(supervisors, "status"),
  portfolio: tally(records, "kind"),
  verifiedCredentials: records.filter((r) => r.verified_at).length,
};
console.log(JSON.stringify(summary, null, 2));
if (
  profiles.length !== 36 ||
  applications.length !== 40 ||
  members.filter((m) => m.status === "Approved").length !== 24 ||
  programs.length !== 20 ||
  supervisors.filter((s) => s.status === "Accepted").length !== 4
)
  throw new Error("Demo verification failed: incomplete cohort");
