// All workspace SWR keys use the local /api/ namespace. Match query variants
// and future modules too, rather than maintaining separate logout allowlists.
export function isWorkspaceCacheKey(key) {
  const resource = Array.isArray(key) ? key[0] : key;
  return (
    typeof resource === "string" &&
    (resource.startsWith("/api/") || resource === "question-bank")
  );
}
