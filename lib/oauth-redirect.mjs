export const OAUTH_CONTEXT_COOKIE = "origin_oauth_context";
const ROLES = ["student", "academician", "institution", "industry"];

export function localReturnPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) return null;
  const url = new URL(value, "https://local.invalid");
  return url.origin === "https://local.invalid" ? `${url.pathname}${url.search}${url.hash}` : null;
}

export function readOAuthContext(value) {
  try {
    const context = JSON.parse(decodeURIComponent(value));
    return {
      mode: context.mode === "signup" ? "signup" : "login",
      role: ROLES.includes(context.role) ? context.role : null,
      next: localReturnPath(context.next),
    };
  } catch {
    return { mode: "login", role: null, next: null };
  }
}

// Keep the allow-listed callback exact; per-login context stays on this host.
export function prepareOAuthRedirect(origin, context, cookieDocument = document) {
  const callback = new URL("/auth/callback", origin);
  const value = encodeURIComponent(JSON.stringify(context));
  cookieDocument.cookie = `${OAUTH_CONTEXT_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax${callback.protocol === "https:" ? "; Secure" : ""}`;
  return callback.href;
}

export function roleReturnPath(next, role) {
  const path = localReturnPath(next);
  if (!path) return `/${role}`;
  const { pathname } = new URL(path, "https://local.invalid");
  return pathname === `/${role}` || pathname.startsWith(`/${role}/`) ? path : `/${role}`;
}
