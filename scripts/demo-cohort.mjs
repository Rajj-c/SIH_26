// Explicitly opt-in demo cohort. Never resets, deletes or updates existing users.
import { createClient } from "@supabase/supabase-js";
import { randomBytes, createHash } from "node:crypto";
import { mkdir, readFile, writeFile, chmod } from "node:fs/promises";
import { requireEvaluatorProject } from "../lib/evaluator-access.mjs";
const BATCH = "tech-pioneers-v1";
const isolated = process.argv.includes("--apply-isolated-evaluator-project");
if (isolated) requireEvaluatorProject(process.env);
const dir = new URL(isolated ? "../.demo-private/evaluator/" : "../.demo-private/", import.meta.url);
const file = new URL("cohort.json", dir);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!isolated && !process.argv.includes("--apply-current-team-database"))
  throw new Error(
    "Explicit --apply-current-team-database required. Adds labelled fictional records to the configured project.",
  );
if (
  !url ||
  !process.env.SUPABASE_SERVICE_ROLE_KEY ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
  throw new Error("Missing Supabase configuration");
const opts = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, opts);
await mkdir(dir, { recursive: true, mode: 0o700 });
await chmod(dir, 0o700);
let state;
try {
  state = JSON.parse(await readFile(file, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  state = {
    batch: BATCH,
    project: url,
    baseDate: new Date().toISOString(),
    accounts: {},
    done: {},
    ids: {},
  };
}
if (state.project !== url || state.batch !== BATCH)
  throw new Error("Manifest project mismatch");
const persist = async () => {
  await writeFile(file, JSON.stringify(state, null, 2), { mode: 0o600 });
  await chmod(file, 0o600);
};
const ok = async (p) => {
  const r = await p;
  if (r.error) throw new Error(r.error.message);
  return r.data;
};
const insertOnly = async (c, table, row) => {
  const exists = await ok(
    c.from(table).select("id").eq("id", row.id).maybeSingle(),
  );
  if (!exists) await ok(c.from(table).insert(row));
};
const date = (d) =>
  new Date(new Date(state.baseDate).getTime() + d * 86400000)
    .toISOString()
    .slice(0, 10);
const id = (key) => {
  const h = createHash("sha256")
    .update(BATCH + ":" + key)
    .digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const industries = [
  "Asterloop Systems",
  "Cobalt Grove Analytics",
  "Verdant Circuit Labs",
  "Northbeam Robotics",
  "Lumenfield Cloud",
  "Tidalbridge Design",
  "Emberleaf Automation",
  "Silverfern Security",
  "Orchardline Mobility",
  "Mosaic Harbor Digital",
];
const students = [
  "Aarav Sen",
  "Diya Rao",
  "Ishaan Mehta",
  "Ananya Bose",
  "Kabir Nair",
  "Meera Shah",
  "Rohan Iyer",
  "Sana Kapoor",
  "Vivaan Das",
  "Tara Menon",
  "Aditya Sethi",
  "Nisha Verma",
  "Arjun Roy",
  "Ira Jain",
  "Dev Malhotra",
  "Leela Pillai",
  "Kunal Sinha",
  "Maya Bhat",
  "Neel Khanna",
  "Riya Thomas",
];
const skills = [
  ["JavaScript", "React", "SQL"],
  ["Python", "SQL", "Data Analysis"],
  ["Python", "IoT", "Communication"],
  ["Python", "Robotics", "Problem Solving"],
  ["Linux", "Cloud Computing", "SQL"],
  ["UI Design", "UX Research", "Communication"],
  ["Python", "Automation", "SQL"],
  ["Linux", "Cybersecurity", "Networking"],
  ["JavaScript", "REST API", "SQL"],
  ["React", "JavaScript", "Communication"],
];
const titles = [
  "Frontend Engineering",
  "Data Analytics",
  "Embedded Systems",
  "Robotics Engineering",
  "Cloud Operations",
  "Product Design",
  "Process Automation",
  "Security Operations",
  "Backend API Engineering",
  "Fullstack Development",
];
const specs = [
  ...industries.map((name, i) => ({
    key: `industry${i + 1}`,
    role: "industry",
    name,
    organization: name + " (Demo)",
    skills: skills[i],
  })),
  ...["Horizon Vale Institute", "Riverstone Technical College"].map(
    (name, i) => ({
      key: `institution${i + 1}`,
      role: "institution",
      name,
      organization: name + " (Demo)",
      skills: [],
    }),
  ),
  ...["Anika Rao", "Vikram Sen", "Mira Das", "Arun Nair"].map((name, i) => ({
    key: `faculty${i + 1}`,
    role: "academician",
    name,
    organization:
      i < 2
        ? "Horizon Vale Institute (Demo)"
        : "Riverstone Technical College (Demo)",
    skills: ["Mentorship", "Research"],
  })),
  ...students.map((name, i) => ({
    key: `student${i + 1}`,
    role: "student",
    name,
    organization:
      i < 10
        ? "Horizon Vale Institute (Demo)"
        : "Riverstone Technical College (Demo)",
    skills: skills[i % 10],
  })),
];
const existing = [];
for (let page = 1; ; page++) {
  const r = await ok(admin.auth.admin.listUsers({ page, perPage: 100 }));
  existing.push(...r.users);
  if (r.users.length < 100) break;
}
const clients = {};
if (isolated && existing.some(user => user.app_metadata?.demo_batch !== BATCH))
  throw new Error("Evaluator project contains non-demo users. Refusing to seed it.");
async function once(key, fn) {
  if (state.done[key]) return;
  await fn();
  state.done[key] = true;
  await persist();
}
for (const s of specs) {
  const email = `tp-demo-${s.key}@example.test`;
  const found = existing.find((u) => u.email === email);
  if (found && found.app_metadata?.demo_batch !== BATCH)
    throw new Error(
      `Email collision for ${s.key}; refusing to touch existing account`,
    );
  if (!state.accounts[s.key]) {
    if (found)
      throw new Error(
        "Demo account exists without local credentials; recover the manifest first",
      );
    state.accounts[s.key] = {
      email,
      password: randomBytes(24).toString("base64url"),
      role: s.role,
    };
    await persist();
  }
  const account = state.accounts[s.key];
  if (!account.id) {
    const user =
      found ||
      (
        await ok(
          admin.auth.admin.createUser({
            email,
            password: account.password,
            email_confirm: true,
            user_metadata: { full_name: s.name + " (Demo)", role: s.role },
            app_metadata: { demo_batch: BATCH },
          }),
        )
      ).user;
    account.id = user.id;
    await persist();
  }
  // Never reassign an ID or reset a password on retries.
  const c = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, opts);
  let login;
  if (account.session) login = await c.auth.setSession(account.session);
  if (!login || login.error) {
    for (let attempt = 0; attempt < 4; attempt++) {
      login = await c.auth.signInWithPassword({
        email,
        password: account.password,
      });
      if (login.error?.status !== 429) break;
      console.log(
        "Authentication rate limit: waiting 60 seconds before retry.",
      );
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }
  const session = await ok(Promise.resolve(login));
  if (
    session.user.id !== account.id ||
    session.user.app_metadata?.demo_batch !== BATCH
  )
    throw new Error("Demo identity mismatch");
  clients[s.key] = c;
  account.session = {
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  };
  await persist();
  await once(`profile:${s.key}`, async () => {
    await ok(
      c
        .from("profiles")
        .update({
          full_name: s.name + " (Demo)",
          organization: s.organization,
          headline:
            s.role === "student"
              ? `${titles[(Number(s.key.replace("student", "")) - 1) % 10]} learner — demonstration profile`
              : "Tech Pioneers demonstration account",
          bio: "Fictional profile created by Tech Pioneers to demonstrate connected prototype workflows. Not a real partner or placement outcome.",
          location: "Bengaluru",
          department:
            s.role === "student"
              ? "Computer Science"
              : "Industry Collaboration",
          program: s.role === "student" ? "B.Tech" : "",
          graduation_year: s.role === "student" ? 2027 : null,
          discoverable: true,
        })
        .eq("id", account.id),
    );
  });
  for (const skill of s.skills)
    await once(`skill:${s.key}:${skill}`, async () => {
      await insertOnly(c, "portfolio_records", {
        id: id(`skill:${s.key}:${skill}`),
        user_id: account.id,
        kind: "skill",
        title: skill,
        description:
          "Self-declared demonstration skill; not independently verified.",
        proficiency: "Intermediate",
      });
    });
  console.log(`Prepared ${s.key}`);
}
for (const s of specs.filter((s) =>
  ["student", "academician"].includes(s.role),
)) {
  const n = Number(s.key.replace(/\D/g, ""));
  const inst =
    s.role === "student"
      ? n <= 10
        ? "institution1"
        : "institution2"
      : n <= 2
        ? "institution1"
        : "institution2";
  await once(`membership:${s.key}`, async () => {
    const member = state.accounts[s.key].id,
      institution = state.accounts[inst].id;
    const existing = await ok(
      admin
        .from("institution_memberships")
        .select("id,status")
        .eq("member_id", member)
        .eq("institution_id", institution)
        .maybeSingle(),
    );
    let membership = existing?.id;
    if (!membership)
      membership = (
        await ok(
          clients[s.key]
            .from("institution_memberships")
            .insert({ member_id: member, institution_id: institution })
            .select("id")
            .single(),
        )
      ).id;
    await ok(
      clients[inst]
        .from("institution_memberships")
        .update({ status: "Approved" })
        .eq("id", membership),
    );
  });
}
for (let i = 0; i < 10; i++) {
  const owner = `industry${i + 1}`;
  for (const type of ["Internship", "Job"])
    await once(`opportunity:${i}:${type}`, async () => {
      await insertOnly(clients[owner], "opportunities", {
        id: id(`opp:${i}:${type}`),
        owner_id: state.accounts[owner].id,
        title: `${titles[i]} ${type === "Job" ? "Associate" : "Intern"} (Demo)`,
        company: industries[i] + " (Demo)",
        type,
        audience: "student",
        location: "Bengaluru",
        work_mode: i % 2 ? "Hybrid" : "Remote",
        duration: type === "Job" ? "Full-time" : "12 weeks",
        stipend:
          type === "Job"
            ? "Demonstration compensation only"
            : "₹12,000/month — fictional demo terms",
        deadline: date(60),
        skills: skills[i],
        description: `DEMONSTRATION OPPORTUNITY — fictional organization, not a real vacancy. Work with ${skills[i].join(", ")} on a supervised project. Responsibilities include implementing a scoped feature, documenting decisions, reviewing quality and presenting weekly progress. Applicants should demonstrate fundamentals and a willingness to learn. All records in this cohort are for the Tech Pioneers prototype demonstration.`,
        seats: 10,
      });
    });
  await once(`program:${i}`, async () => {
    let p = await ok(
      clients[owner]
        .from("opportunities")
        .select("id")
        .eq("owner_id", state.accounts[owner].id)
        .eq("title", `${titles[i]} Applied Workshop (Demo)`)
        .maybeSingle(),
    );
    if (!p) {
      const result = await ok(
        clients[owner].rpc("publish_learning_program", {
          payload: {
            title: `${titles[i]} Applied Workshop (Demo)`,
            format: "Workshop",
            level: "Foundation",
            audience: "student",
            location: "Online",
            work_mode: "Remote",
            duration: "2 weeks",
            deadline: date(20),
            starts_on: date(25),
            ends_on: date(39),
            skills: skills[i],
            description:
              "Fictional workshop for demonstrating learning discovery and enrollment. Not an accredited course or real event. Work through a guided project and receive structured feedback.",
            seats: 30,
            schedule: "Two guided sessions per week, 90 minutes each.",
            prerequisites:
              "Basic familiarity with the listed skills and a development environment.",
            outcomes: [
              "Explain the core concepts through a worked example",
              "Build and document a small guided project",
            ],
            curriculum: [
              "Foundations and a guided domain case study",
              "Practical implementation and structured peer review",
            ],
            instructor: industries[i] + " demo mentoring team",
            fee_terms: "Free demonstration; no payments collected",
            credential_terms:
              "No accredited certification. Demo participation only.",
            completion_rules:
              "Submit a project summary for publisher review; enrollment alone is not completion.",
            contact: "Tech Pioneers demo team — no external contact",
          },
        }),
      );
      p = { id: result };
    }
    state.ids[`program${i}`] = p.id;
  });
}
for (let i = 0; i < 20; i++) {
  const student = `student${i + 1}`,
    owner = `industry${(i % 10) + 1}`;
  const c = clients[student],
    employer = clients[owner];
  await once(`enroll:${i}`, () =>
    ok(
      c.rpc("enroll_learning_program", {
        program: state.ids[`program${i % 10}`],
        accepted_terms: true,
      }),
    ),
  );
  for (const type of ["Internship", "Job"]) {
    const k = `application:${i}:${type}`;
    await once(k, async () => {
      state.ids[k] = await ok(
        c.rpc("apply_to_opportunity", {
          opportunity: id(`opp:${i % 10}:${type}`),
        }),
      );
    });
    const app = state.ids[k];
    if (i % 5 > 0)
      await once(k + ":review", () =>
        ok(
          employer
            .from("applications")
            .update({
              status: "Under Review",
              next_step: "Demo recruiter is reviewing the submitted profile",
              feedback:
                "Simulated recruitment activity for prototype demonstration.",
            })
            .eq("id", app),
        ),
      );
    if (i % 5 > 1)
      await once(k + ":shortlist", () =>
        ok(
          employer
            .from("applications")
            .update({
              status: "Shortlisted",
              next_step: "Demo candidate selected for a technical discussion",
            })
            .eq("id", app),
        ),
      );
    if (i % 5 === 3)
      await once(k + ":interview", () =>
        ok(
          employer.rpc("schedule_application_interview", {
            app,
            starts: new Date(
              new Date(state.baseDate).getTime() + 7 * 86400000,
            ).toISOString(),
            minutes: 30,
            channel: "Video",
            place: "Demo meeting — no external meeting link",
            notes:
              "Simulated technical discussion. No real interview or invitation.",
          }),
        ),
      );
    if (i % 5 === 4 && type === "Internship") {
      await once(k + ":offered", () =>
        ok(
          employer
            .from("applications")
            .update({
              status: "Offered",
              next_step: "Review the fictional internship dates",
            })
            .eq("id", app),
        ),
      );
      await once(k + ":dates", () =>
        ok(
          employer.rpc("configure_internship", {
            app,
            begins: date(-7),
            ends: date(77),
          }),
        ),
      );
      await once(k + ":accepted", () =>
        ok(c.rpc("respond_internship_offer", { app, decision: "Accepted" })),
      );
      await once(k + ":milestone", async () => {
        let m = await ok(
          employer
            .from("internship_milestones")
            .select("id")
            .eq("application_id", app)
            .eq("title", "Project scope and initial implementation (Demo)")
            .maybeSingle(),
        );
        if (!m)
          m = await ok(
            employer
              .from("internship_milestones")
              .insert({
                application_id: app,
                title: "Project scope and initial implementation (Demo)",
                description:
                  "Demonstration milestone for the supervised internship workflow.",
                due_on: date(7),
              })
              .select("id")
              .single(),
          );
        state.ids[k + ":milestone"] = m.id;
      });
      await once(k + ":log", async () => {
        const existing = await ok(
          c
            .from("internship_logs")
            .select("id")
            .eq("milestone_id", state.ids[k + ":milestone"])
            .limit(1),
        );
        if (!existing.length)
          await ok(
            c.from("internship_logs").insert({
              application_id: app,
              milestone_id: state.ids[k + ":milestone"],
              week_ending: date(0),
              summary:
                "DEMO ACTIVITY: Prepared a project outline, documented the implementation approach and identified the next review questions. This is fictional progress for the prototype demonstration.",
            }),
          );
      });
    }
  }
}
for (let i = 0; i < 20; i++) {
  const student = `student${i + 1}`;
  await once(`project:${i}`, () =>
    insertOnly(clients[student], "portfolio_records", {
      id: id(`project:${i}`),
      user_id: state.accounts[student].id,
      kind: "project",
      title: `${titles[i % 10]} Capstone (Demo)`,
      description:
        "Fictional portfolio example for demonstrating the project record workflow. No external project, achievement or credential is claimed.",
      associated_skills: skills[i % 10],
      contribution:
        "Demo scope: requirements, implementation outline, testing strategy and documentation.",
    }),
  );
  if (i % 5 !== 4) continue;
  const app = state.ids[`application:${i}:Internship`],
    institution = i < 10 ? "institution1" : "institution2",
    faculty = `faculty${Math.floor(i / 5) + 1}`;
  await once(`supervision:${i}`, async () => {
    let invitation = await ok(
      clients[institution]
        .from("internship_supervisors")
        .select("id,status")
        .eq("application_id", app)
        .eq("kind", "Faculty")
        .eq("supervisor_id", state.accounts[faculty].id)
        .in("status", ["Pending", "Accepted"])
        .maybeSingle(),
    );
    if (!invitation) {
      await ok(
        clients[institution].rpc("assign_internship_supervisor", {
          app,
          person: state.accounts[faculty].id,
          assignment_kind: "Faculty",
        }),
      );
      invitation = await ok(
        clients[faculty]
          .from("internship_supervisors")
          .select("id,status")
          .eq("application_id", app)
          .eq("kind", "Faculty")
          .eq("status", "Pending")
          .single(),
      );
    }
    if (invitation.status === "Pending")
      await ok(
        clients[faculty].rpc("respond_supervision", {
          invitation: invitation.id,
          decision: "Accepted",
        }),
      );
  });
}
console.log(
  "Demo cohort populated. Credentials and exact created IDs are in .demo-private/cohort.json (not committed). No verification badges or completed placements were fabricated.",
);
