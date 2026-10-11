// Owner-authorized fictional journey. All writes use the four guest sessions.
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import {
  SHARED_EVALUATOR_ACCOUNTS,
  SHARED_EVALUATOR_BATCH,
} from "../lib/shared-evaluator-accounts.mjs";
if (!process.argv.includes("--apply-evaluation-journey"))
  throw new Error("Explicit --apply-evaluation-journey required.");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) throw new Error("Missing Supabase configuration.");
const clients = {},
  users = {};
const ok = async (promise) => {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
};
const id = (name) => {
  const h = createHash("sha256")
    .update(url + ":public-evaluation-v1:" + name)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const date = (days) =>
  new Date(Date.now() + days * 86400000).toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata",
  });
// Authenticate and verify ALL identities before any data writes.
for (const account of SHARED_EVALUATOR_ACCOUNTS) {
  const c = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const login = await ok(c.auth.signInWithPassword(account));
  if (login.user.app_metadata?.evaluation_batch !== SHARED_EVALUATOR_BATCH)
    throw new Error("Not a managed evaluation account.");
  const p = await ok(
    c.from("profiles").select("id,role").eq("id", login.user.id).single(),
  );
  if (p.role !== account.role) throw new Error("Role mismatch.");
  clients[account.role] = c;
  users[account.role] = p.id;
}
async function ensure(c, table, row) {
  const existing = await ok(
    c.from(table).select("*").eq("id", row.id).maybeSingle(),
  );
  return existing || (await ok(c.from(table).insert(row).select("*").single()));
}
try {
  for (const role of Object.keys(clients)) {
    const c = clients[role];
    const profile = await ok(
      c
        .from("profiles")
        .select("organization,bio")
        .eq("id", users[role])
        .single(),
    );
    if (!profile.organization && !profile.bio)
      await ok(
        c
          .from("profiles")
          .update({
            organization:
              role === "industry"
                ? "Evaluation Demo Industry Lab"
                : "Evaluation Demo Institute",
            headline: `Evaluation Demo · ${role} workspace`,
            bio: "Evaluation Demo: fictional shared profile for the Tech Pioneers prototype. Not a real employer, qualification or placement outcome.",
          })
          .eq("id", users[role]),
      );
  }
  const student = clients.student,
    industry = clients.industry,
    faculty = clients.academician,
    institution = clients.institution;
  for (const skill of ["JavaScript", "SQL", "Communication"])
    await ensure(student, "portfolio_records", {
      id: id(`skill:${skill}`),
      user_id: users.student,
      kind: "skill",
      title: skill,
      description:
        "Evaluation Demo: self-declared sample skill, not assessed or independently verified.",
      proficiency: "Intermediate",
    });
  await ensure(student, "portfolio_records", {
    id: id("project"),
    user_id: users.student,
    kind: "project",
    title: "Evaluation Demo · Campus opportunity tracker",
    description:
      "Fictional project outline demonstrating requirements, database design and testing. No real deployment or achievement claimed.",
    associated_skills: ["JavaScript", "SQL"],
    contribution:
      "Evaluation Demo: draft requirements, schema outline and test scenarios.",
  });
  for (const role of ["student", "academician"]) {
    let membership = await ok(
      clients[role]
        .from("institution_memberships")
        .select("id,status")
        .eq("institution_id", users.institution)
        .eq("member_id", users[role])
        .maybeSingle(),
    );
    if (!membership)
      membership = await ok(
        clients[role]
          .from("institution_memberships")
          .insert({ institution_id: users.institution, member_id: users[role] })
          .select("id,status")
          .single(),
      );
    if (membership.status === "Pending")
      await ok(
        institution
          .from("institution_memberships")
          .update({ status: "Approved" })
          .eq("id", membership.id),
      );
    else if (membership.status !== "Approved")
      throw new Error(
        "Membership was changed by an evaluator; refusing to overwrite it.",
      );
  }
  console.log(
    "Prepared labelled profiles, self-declared skills and two approved guest memberships.",
  );
  const opp = await ensure(industry, "opportunities", {
    id: id("internship"),
    owner_id: users.industry,
    title: "Evaluation Demo · Web platform internship",
    company: "Evaluation Demo Industry Lab",
    type: "Internship",
    audience: "student",
    location: "Online",
    work_mode: "Remote",
    duration: "6 weeks",
    stipend: "Evaluation only; no compensation or employment commitment",
    deadline: date(45),
    skills: ["JavaScript", "SQL", "Communication"],
    description:
      "Evaluation Demo: fictional internship, not a real vacancy. Explore requirements, implement a small interface, document database queries and discuss testing with a supervisor. This record exists only to demonstrate the connected application and internship workflow.",
    seats: 4,
  });
  let application = await ok(
    student
      .from("applications")
      .select("id,status")
      .eq("opportunity_id", opp.id)
      .eq("applicant_id", users.student)
      .maybeSingle(),
  );
  if (!application) {
    const app = await ok(
      student.rpc("apply_to_opportunity", { opportunity: opp.id }),
    );
    application = { id: app, status: "Applied" };
  }
  for (const [from, to] of [
    ["Applied", "Under Review"],
    ["Under Review", "Shortlisted"],
    ["Shortlisted", "Offered"],
  ]) {
    if (application.status === from) {
      await ok(
        industry
          .from("applications")
          .update({
            status: to,
            next_step:
              "Evaluation Demo: review the supervised project workflow",
            feedback:
              "Simulated review for evaluation only; no real hiring decision.",
          })
          .eq("id", application.id),
      );
      application.status = to;
    }
  }
  if (application.status !== "Offered")
    throw new Error(
      "Application has changed; refusing to overwrite evaluator activity.",
    );
  const app = application.id;
  let arrangement = await ok(
    student
      .from("internship_arrangements")
      .select("*")
      .eq("application_id", app)
      .maybeSingle(),
  );
  if (!arrangement?.start_on) {
    await ok(
      industry.rpc("configure_internship", {
        app,
        begins: date(0),
        ends: date(42),
      }),
    );
    arrangement = { response: "Pending" };
  }
  if (arrangement.response === "Pending")
    await ok(
      student.rpc("respond_internship_offer", { app, decision: "Accepted" }),
    );
  else if (arrangement.response !== "Accepted")
    throw new Error("Offer declined; refusing to overwrite evaluator choice.");
  let milestone = await ok(
    industry
      .from("internship_milestones")
      .select("*")
      .eq("application_id", app)
      .eq("title", "Evaluation Demo · Requirements and test plan")
      .maybeSingle(),
  );
  if (!milestone)
    milestone = await ok(
      industry
        .from("internship_milestones")
        .insert({
          application_id: app,
          title: "Evaluation Demo · Requirements and test plan",
          description:
            "Simulated progress milestone. Review the demonstration scope and propose test scenarios.",
          due_on: date(7),
        })
        .select("*")
        .single(),
    );
  const savedLog = await ok(
    student
      .from("internship_logs")
      .select("id")
      .eq("application_id", app)
      .eq("milestone_id", milestone.id)
      .limit(1),
  );
  if (!savedLog.length)
    await ok(
      student.from("internship_logs").insert({
        application_id: app,
        milestone_id: milestone.id,
        week_ending: date(0),
        summary:
          "Evaluation Demo: drafted a sample requirements outline and test checklist for the fictional campus tracker. This is simulated progress, not real completed work.",
      }),
    );
  if (milestone.status === "Pending" && !milestone.feedback)
    await ok(
      industry
        .from("internship_milestones")
        .update({
          status: "Pending",
          feedback:
            "Evaluation Demo mentor feedback: add explicit acceptance criteria and cover empty states, access control and failed requests before the next review.",
        })
        .eq("id", milestone.id),
    );
  let invitation = await ok(
    institution
      .from("internship_supervisors")
      .select("id,status,supervisor_id")
      .eq("application_id", app)
      .eq("kind", "Faculty")
      .in("status", ["Pending", "Accepted"])
      .maybeSingle(),
  );
  if (!invitation) {
    await ok(
      institution.rpc("assign_internship_supervisor", {
        app,
        person: users.academician,
        assignment_kind: "Faculty",
      }),
    );
    invitation = await ok(
      faculty
        .from("internship_supervisors")
        .select("id,status,supervisor_id")
        .eq("application_id", app)
        .eq("kind", "Faculty")
        .single(),
    );
  }
  if (invitation.supervisor_id !== users.academician)
    throw new Error("Unexpected supervisor; refusing to modify assignment.");
  if (invitation.status === "Pending")
    await ok(
      faculty.rpc("respond_supervision", {
        invitation: invitation.id,
        decision: "Accepted",
      }),
    );
  console.log(
    "Connected student application, active internship, progress log, industry feedback and accepted faculty supervision.",
  );
  const title = "Evaluation Demo · Practical web and SQL workshop";
  let program = await ok(
    industry
      .from("opportunities")
      .select("id")
      .eq("owner_id", users.industry)
      .eq("title", title)
      .maybeSingle(),
  );
  if (!program)
    program = {
      id: await ok(
        industry.rpc("publish_learning_program", {
          payload: {
            title,
            format: "Workshop",
            level: "Foundation",
            audience: "student",
            location: "Online",
            work_mode: "Remote",
            duration: "2 weeks",
            deadline: date(14),
            starts_on: date(15),
            ends_on: date(29),
            skills: ["JavaScript", "SQL"],
            description:
              "Evaluation Demo: fictional industry workshop for exploring enrollment and learning workflows. No real event, accreditation or certification is claimed.",
            seats: 10,
            schedule:
              "Two 90-minute demonstration sessions per week; Asia/Kolkata.",
            prerequisites:
              "Basic JavaScript syntax and introductory relational database concepts.",
            outcomes: [
              "Design a small relational schema with explicit constraints",
              "Write and explain queries for a sample opportunity tracker",
            ],
            curriculum: [
              "Session one: schema design, keys and query fundamentals",
              "Session two: interface integration, error handling and test review",
            ],
            instructor: "Evaluation Demo Industry Lab mentoring team",
            fee_terms: "Free evaluation; no payment collected",
            credential_terms:
              "No accredited credential; demonstration participation only",
            completion_rules:
              "Submit a project summary for publisher review. Enrollment alone is not completion.",
            contact: "Tech Pioneers evaluation team; no external email",
          },
        }),
      ),
    };
  const enrollment = await ok(
    student
      .from("program_enrollments")
      .select("id")
      .eq("program_id", program.id)
      .eq("learner_id", users.student)
      .maybeSingle(),
  );
  if (!enrollment)
    await ok(
      student.rpc("enroll_learning_program", {
        program: program.id,
        accepted_terms: true,
      }),
    );
  // Verify saved cross-role visibility, without admin/service-role reads.
  for (const role of ["student", "industry", "institution"]) {
    const record = await ok(
      clients[role].from("applications").select("id").eq("id", app).single(),
    );
    if (record.id !== app)
      throw new Error("Application visibility verification failed.");
  }
  const supervision = await ok(faculty.rpc("my_supervision"));
  if (!JSON.stringify(supervision).includes(app))
    throw new Error("Faculty supervision visibility verification failed.");
  console.log(
    "Verified connected application visibility and faculty supervision. Learning enrollment saved. No certificates, assessment scores or placement completions were fabricated.",
  );
} finally {
  await Promise.all(
    Object.values(clients).map((c) => c.auth.signOut({ scope: "local" })),
  );
}
