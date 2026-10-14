// @ts-nocheck
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { normalizeSupabaseUrl } from "./project-url.mjs";

/**
 * Supabase admin client configured with secret / service role key.
 * Should ONLY be used in secure server environments (Route Handlers, Server Actions).
 */
export function createAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase URL or Secret Key in environment variables.");
  }

  return createSupabaseClient(normalizeSupabaseUrl(supabaseUrl), supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
