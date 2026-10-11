import { createClient } from "@supabase/supabase-js";
import {
  SHARED_EVALUATOR_ACCOUNTS,
  SHARED_EVALUATOR_BATCH,
  assertGuestCollisionsSafe,
} from "../lib/shared-evaluator-accounts.mjs";

if (!process.argv.includes("--create-public-guests-in-current-project"))
  throw new Error(
    "Explicit --create-public-guests-in-current-project is required.",
  );
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !service || !anon)
  throw new Error("Missing Supabase configuration.");
const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(url, service, options);
async function checked(promise) {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return data;
}
const users = [];
for (let page = 1; ; page++) {
  const data = await checked(
    admin.auth.admin.listUsers({ page, perPage: 100 }),
  );
  users.push(...data.users);
  if (data.users.length < 100) break;
}
// Preflight all four addresses before any writes. Never reset existing passwords.
assertGuestCollisionsSafe(users);
for (const account of SHARED_EVALUATOR_ACCOUNTS) {
  let user = users.find((user) => user.email?.toLowerCase() === account.email);
  if (!user) {
    const result = await checked(
      admin.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          role: account.role,
          full_name: `${account.role[0].toUpperCase()}${account.role.slice(1)} Guest (Evaluation)`,
        },
        app_metadata: { evaluation_batch: SHARED_EVALUATOR_BATCH },
      }),
    );
    user = result.user;
    console.log(`Created ${account.role} evaluation account (no email sent).`);
  }
  const client = createClient(url, anon, options);
  const login = await checked(
    client.auth.signInWithPassword({
      email: account.email,
      password: account.password,
    }),
  );
  if (
    login.user.id !== user.id ||
    login.user.app_metadata?.evaluation_batch !== SHARED_EVALUATOR_BATCH
  )
    throw new Error("Evaluation account identity check failed.");
  const profile = await checked(
    client.from("profiles").select("id,role").eq("id", user.id).single(),
  );
  if (profile.role !== account.role)
    throw new Error("Evaluation profile role mismatch.");
  await client.auth.signOut({ scope: "local" });
  console.log(`Verified ${account.role} password login and assigned role.`);
}
console.log(
  "Four guest accounts verified. No existing user, membership, application or reviewer permission was changed.",
);
