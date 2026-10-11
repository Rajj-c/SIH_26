// Summarize only the already-authorized, date-filtered outcome model.
// These separate event totals are not a recruitment conversion funnel.
export const outcomeSeries = [
  { key: "applications", label: "Applications", color: "#2563eb" },
  {
    key: "learningCompletions",
    label: "Learning completions",
    color: "#0d9488",
  },
  {
    key: "confirmedJoinings",
    label: "Joining confirmations",
    color: "#9333ea",
  },
];

export function summarizeOutcomeMonths(months) {
  const totals = Object.fromEntries(outcomeSeries.map(({ key }) => [key, 0]));
  for (const month of months) {
    for (const { key } of outcomeSeries) {
      const value = month[key];
      if (!Number.isSafeInteger(value) || value < 0)
        throw new Error("Outcome counts must be non-negative whole numbers.");
      totals[key] += value;
      if (!Number.isSafeInteger(totals[key]))
        throw new Error("Outcome totals exceed the supported range.");
    }
  }
  return {
    totals,
    hasActivity: Object.values(totals).some((value) => value > 0),
  };
}
