import { createClient } from "./supabase/server";
import { normalizeTrack } from "./learning-tracks";
export async function getPublishedTrack(id: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    return null;
  const db = await createClient();
  const { data, error } = await db
    .from("learning_tracks")
    .select("*")
    .eq("id", id)
    .eq("status", "Published")
    .maybeSingle();
  if (error) throw new Error("Learning catalog unavailable");
  return data ? normalizeTrack(data) : null;
}
