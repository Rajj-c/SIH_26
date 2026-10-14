// @ts-nocheck
import { createBrowserClient } from "@supabase/ssr";
import { normalizeSupabaseUrl } from "./project-url.mjs";

export function createClient() {
  return createBrowserClient(
    normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );
}

export const supabase = createClient();
