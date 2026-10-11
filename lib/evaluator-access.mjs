import { SHARED_EVALUATOR_ACCOUNTS } from "./shared-evaluator-accounts.mjs";

export const EVALUATOR_ROLES = [
  "student",
  "industry",
  "academician",
  "institution",
];

function projectOrigin(value) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    !/^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  )
    throw new Error("Use a hosted Supabase project URL.");
  return url.origin;
}

export function requireEvaluatorProject(env) {
  const active = projectOrigin(env.NEXT_PUBLIC_SUPABASE_URL);
  const sandbox = projectOrigin(env.EVALUATOR_SUPABASE_URL);
  const primary = projectOrigin(env.PRIMARY_SUPABASE_URL);
  if (active !== sandbox || sandbox === primary)
    throw new Error(
      "Evaluator access requires a separate configured Supabase project.",
    );
  return sandbox;
}

export function evaluatorAccess(env) {
  if (env.EVALUATOR_SHARED_GUESTS_ENABLED === "pending")
    return { mode: "shared-pending", accounts: SHARED_EVALUATOR_ACCOUNTS };
  if (env.EVALUATOR_SHARED_GUESTS_ENABLED === "true")
    return { mode: "shared", accounts: SHARED_EVALUATOR_ACCOUNTS };
  if (env.EVALUATOR_ACCESS_ENABLED !== "true") {
    if (!env.EVALUATOR_DEMO_URL) return { mode: "disabled" };
    const url = new URL(env.EVALUATOR_DEMO_URL);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error("Invalid evaluator deployment URL.");
    return { mode: "external", url: url.href };
  }
  requireEvaluatorProject(env);
  // A public, shared sandbox must not consume paid AI or send real emails.
  if (env.GEMINI_API_KEY || env.RESEND_API_KEY || env.NOTIFICATION_JOB_SECRET)
    throw new Error(
      "Disable external delivery and paid AI in the public sandbox.",
    );
  const accounts = JSON.parse(env.EVALUATOR_ACCOUNTS_JSON || "null");
  const emails = {
    student: "tp-demo-student5@example.test",
    industry: "tp-demo-industry5@example.test",
    academician: "tp-demo-faculty1@example.test",
    institution: "tp-demo-institution1@example.test",
  };
  if (!Array.isArray(accounts) || accounts.length !== 4)
    throw new Error("Four evaluator identities are required.");
  return {
    mode: "sandbox",
    accounts: EVALUATOR_ROLES.map((role) => {
      const matches = accounts.filter((a) => a?.role === role);
      const account = matches[0];
      if (
        matches.length !== 1 ||
        account.email !== emails[role] ||
        typeof account.password !== "string" ||
        account.password.length < 16 ||
        account.password.length > 128
      )
        throw new Error("Invalid evaluator identity configuration.");
      // Never return manifest sessions, tokens, IDs or other configuration.
      return { role, email: account.email, password: account.password };
    }),
  };
}
