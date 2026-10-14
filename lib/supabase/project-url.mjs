/** Accept a project URL, including a mistakenly copied REST API endpoint. */
export function normalizeSupabaseUrl(value) {
  const url = new URL((value || "").trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Supabase URL must be an HTTP(S) project URL without credentials or query parameters.');
  }
  url.pathname = url.pathname.replace(/\/+$/, '').replace(/\/rest\/v1$/, '');
  return url.toString().replace(/\/$/, '');
}
