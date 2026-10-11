import test from "node:test";
import assert from "node:assert/strict";
import {
  SHARED_EVALUATOR_ACCOUNTS,
  SHARED_EVALUATOR_BATCH,
  assertGuestCollisionsSafe,
} from "../lib/shared-evaluator-accounts.mjs";
import { evaluatorAccess } from "../lib/evaluator-access.mjs";

test("shared evaluator access is opt-in and publishes only the four user-approved credentials", () => {
  assert.equal(evaluatorAccess({}).mode, "disabled");
  assert.equal(
    evaluatorAccess({ EVALUATOR_SHARED_GUESTS_ENABLED: "pending" }).mode,
    "shared-pending",
  );
  const access = evaluatorAccess({ EVALUATOR_SHARED_GUESTS_ENABLED: "true" });
  assert.equal(access.mode, "shared");
  assert.equal(access.accounts.length, 4);
  for (const account of access.accounts) {
    assert.equal(account.email, `${account.role}@guest.com`);
    assert.equal(account.password, `${account.role}@123`);
    assert.deepEqual(Object.keys(account).sort(), [
      "email",
      "password",
      "role",
    ]);
  }
});

test("preflight refuses unrelated existing accounts and role collisions without resetting credentials", () => {
  assert.doesNotThrow(() => assertGuestCollisionsSafe([]));
  const managed = SHARED_EVALUATOR_ACCOUNTS.map((account) => ({
    email: account.email,
    app_metadata: { evaluation_batch: SHARED_EVALUATOR_BATCH },
    user_metadata: { role: account.role },
  }));
  assert.doesNotThrow(() => assertGuestCollisionsSafe(managed));
  assert.throws(
    () => assertGuestCollisionsSafe([{ email: "Student@guest.com" }]),
    /overwritten/,
  );
  assert.throws(
    () =>
      assertGuestCollisionsSafe([
        { ...managed[0], user_metadata: { role: "industry" } },
      ]),
    /overwritten/,
  );
  assert.doesNotThrow(() =>
    assertGuestCollisionsSafe([{ email: "unrelated@example.test" }]),
  );
});
