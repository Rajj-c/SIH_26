/** A deliberately narrow CSV format: one email column, no inferred profile data. */
export function parseRosterCSV(text) {
  if (typeof text !== "string" || text.length > 100000)
    throw new Error("Choose an email-only CSV smaller than 100 KB.");
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.shift()?.replace(/^"|"$/g, "").toLowerCase() !== "email")
    throw new Error("The CSV must have one column headed email.");
  const addresses = lines.map((l) =>
    l
      .replace(/^"([^"\r\n]+)"$/, "$1")
      .trim()
      .toLowerCase(),
  );
  if (addresses.length < 1 || addresses.length > 200)
    throw new Error("Import 1–200 rows at a time.");
  for (const [i, email] of addresses.entries())
    if (
      email.length > 254 ||
      !/^[^\s@,"<>]+@[^\s@,"<>]+\.[^\s@,"<>]+$/.test(email)
    )
      throw new Error(
        `Invalid email or extra columns on row ${i + 2}. Nothing was imported.`,
      );
  return {
    emails: [...new Set(addresses)],
    duplicates: addresses.length - new Set(addresses).size,
  };
}
