// Intentionally public credentials, explicitly chosen by the project owner.
// Never reuse these passwords for personal, staff or reviewer accounts.
export const SHARED_EVALUATOR_BATCH = "tech-pioneers-public-guests-v1";
export const SHARED_EVALUATOR_ACCOUNTS = [
  "student",
  "industry",
  "academician",
  "institution",
].map((role) => ({
  role,
  email: `${role}@guest.com`,
  password: `${role}@123`,
}));

export function assertGuestCollisionsSafe(users) {
  for (const account of SHARED_EVALUATOR_ACCOUNTS) {
    const existing = users.find(
      (user) => user.email?.toLowerCase() === account.email,
    );
    if (
      existing &&
      (existing.app_metadata?.evaluation_batch !== SHARED_EVALUATOR_BATCH ||
        existing.user_metadata?.role !== account.role)
    )
      throw new Error(
        `Existing ${account.role} address is not a managed evaluation account. No account will be overwritten.`,
      );
  }
}
