import { skillKey, skillName } from "./skill-taxonomy.mjs";
/** Historical events for the CURRENT authorized cohort; never reconstruct former membership or statuses. */
export function buildOutcomeTrends({
  platform,
  learning,
  recruitment,
  from,
  to,
  department = "",
  year = "",
}) {
  const start = Date.parse(from + "T00:00:00Z"),
    end = Date.parse(to + "T00:00:00Z") + 86400000;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    new Date(start).toISOString().slice(0, 10) !== from ||
    new Date(end - 86400000).toISOString().slice(0, 10) !== to ||
    end <= start ||
    end - start > 366 * 86400000
  )
    throw new Error("Choose a valid date range of at most 366 days.");
  const inRange = (date) =>
    Number.isFinite(Date.parse(date)) &&
    Date.parse(date) >= start &&
    Date.parse(date) < end;
  const institution = platform.profile.role === "institution";
  const approved = new Set(
    platform.memberships
      .filter(
        (m) =>
          m.institution_id === platform.profile.id && m.status === "Approved",
      )
      .map((m) => m.member_id),
  );
  const owned = new Set(
    platform.opportunities
      .filter((o) => o.ownerId === platform.profile.id)
      .map((o) => o.id),
  );
  const applicantIds = new Set(
    platform.applications
      .filter((a) => owned.has(a.opportunityId))
      .map((a) => a.applicantId),
  );
  const members = platform.directory.filter(
    (p) =>
      (institution ? approved : applicantIds).has(p.id) &&
      (!department || p.department === department) &&
      (!year || String(p.graduation_year) === year),
  );
  const ids = new Set(members.map((p) => p.id));
  const apps = platform.applications.filter(
    (a) =>
      ids.has(a.applicantId) && (institution || owned.has(a.opportunityId)),
  );
  const jobIds = new Set(
    platform.opportunities.filter((o) => o.type === "Job").map((o) => o.id),
  );
  const appIds = new Set(
    apps.filter((a) => jobIds.has(a.opportunityId)).map((a) => a.id),
  );
  const months = new Map();
  for (
    let date = new Date(start);
    date.getTime() < end;
    date = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
  )
    months.set(date.toISOString().slice(0, 7), {
      month: date.toISOString().slice(0, 7),
      applications: 0,
      learningCompletions: 0,
      confirmedJoinings: 0,
    });
  for (const a of apps)
    if (inRange(a.appliedAt))
      months.get(new Date(a.appliedAt).toISOString().slice(0, 7))
        .applications++;
  for (const e of learning.enrollments)
    if (
      ids.has(e.learner_id) &&
      e.status === "Completed" &&
      inRange(e.completed_at) &&
      (institution ||
        learning.programs.some(
          (p) =>
            p.id === e.program_id &&
            p.opportunity.owner_id === platform.profile.id,
        ))
    )
      months.get(new Date(e.completed_at).toISOString().slice(0, 7))
        .learningCompletions++;
  for (const offer of recruitment.offers)
    if (
      appIds.has(offer.application_id) &&
      offer.response === "Accepted" &&
      offer.employer_joined_at &&
      offer.applicant_joined_at
    ) {
      const confirmed = new Date(
        Math.max(
          Date.parse(offer.employer_joined_at),
          Date.parse(offer.applicant_joined_at),
        ),
      ).toISOString();
      if (inRange(confirmed))
        months.get(confirmed.slice(0, 7)).confirmedJoinings++;
    }
  const demand = new Map();
  let opportunities = 0;
  for (const o of platform.opportunities) {
    if (
      !["Job", "Internship", "Apprenticeship"].includes(o.type) ||
      !inRange(o.publishedAt)
    )
      continue;
    opportunities++;
    for (const key of new Set(o.skills.map(skillKey).filter(Boolean))) {
      const entry = demand.get(key) ?? {
        skill: skillName(key),
        opportunities: 0,
        sourceIds: [],
      };
      entry.opportunities++;
      entry.sourceIds.push(o.id);
      demand.set(key, entry);
    }
  }
  return {
    from,
    to,
    cohortSize: members.length,
    months: [...months.values()],
    demand: [...demand.values()].sort(
      (a, b) =>
        b.opportunities - a.opportunities || a.skill.localeCompare(b.skill),
    ),
    opportunities,
    scope: institution
      ? "Current approved institution members"
      : "Current applicants to your opportunities",
    definitions: [
      "UTC calendar dates. Current membership and source visibility determine the cohort; this is not a historical membership snapshot.",
      "Applications count submission timestamps. Learning completions count reviewed completion records, not attendance. Joining counts both-party confirmation timestamps, not planned joining dates.",
      "Skill demand counts distinct currently visible hiring opportunities published in the selected period, using their current skill requirements. It is platform activity, not national demand or an archived requirements history.",
    ],
  };
}
