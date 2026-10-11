"use client";
import useSWR, { mutate } from "swr";
import { supabase } from "./supabase/client";
import { normalizeTrack, type LearningTrack } from "./learning-tracks";
const KEY = "/api/learning-tracks";
export function useLearningTracks() {
  const state = useSWR<LearningTrack[]>(
    KEY,
    async () => {
      const records: LearningTrack[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase
          .from("learning_tracks")
          .select("*")
          .order("id")
          .range(offset, offset + 499);
        if (error)
          throw new Error(
            "Learning tracks could not load. Apply migration 016 and retry.",
          );
        records.push(...data.map(normalizeTrack));
        if (data.length < 500) return records;
      }
    },
    { shouldRetryOnError: false, refreshInterval: 30000 },
  );
  return {
    data: state.data,
    loading: state.isLoading,
    error: state.error?.message as string | undefined,
    refresh: state.mutate,
  };
}
export async function trackAction(
  name: "publish_learning_track" | "archive_learning_track",
  args: Record<string, unknown>,
) {
  const { error } = await supabase.rpc(name, args);
  if (error) throw error;
  await mutate(KEY);
}
