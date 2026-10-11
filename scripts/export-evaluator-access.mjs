// Run only after seeding the NEW isolated project. Never export the team manifest.
import { readFile, writeFile, chmod } from "node:fs/promises";
import {
  evaluatorAccess,
  requireEvaluatorProject,
} from "../lib/evaluator-access.mjs";

const project = requireEvaluatorProject(process.env);
const dir = new URL("../.demo-private/evaluator/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("cohort.json", dir), "utf8"),
);
if (
  new URL(manifest.project).origin !== project ||
  manifest.batch !== "tech-pioneers-v1"
)
  throw new Error("Evaluator manifest does not match the isolated project.");
const accounts = ["student5", "industry5", "faculty1", "institution1"].map(
  (key) => {
    const account = manifest.accounts[key];
    if (!account?.id || !manifest.done[`profile:${key}`])
      throw new Error("Provisioning is incomplete.");
    return {
      role: account.role,
      email: account.email,
      password: account.password,
    };
  },
);
const access = evaluatorAccess({
  ...process.env,
  EVALUATOR_ACCESS_ENABLED: "true",
  EVALUATOR_ACCOUNTS_JSON: JSON.stringify(accounts),
});
const output = new URL("public-guest-accounts.json", dir);
await writeFile(output, JSON.stringify(access.accounts, null, 2), {
  mode: 0o600,
  flag: "wx",
});
await chmod(output, 0o600);
console.log(
  "Created .demo-private/evaluator/public-guest-accounts.json for EVALUATOR_ACCOUNTS_JSON. This file contains intentionally public guest passwords only; no session tokens. Existing exports are never overwritten.",
);
