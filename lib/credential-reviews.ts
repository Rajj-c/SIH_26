"use client";
import useSWR from "swr";
import { supabase } from "@/lib/supabase/client";
export function useCredentialReviews() {
  const s = useSWR(
    "/api/credential-reviews",
    async () => {
      async function rows(table: string) {
        const all: any[] = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await supabase
            .from(table)
            .select("*")
            .order("id")
            .range(offset, offset + 499);
          if (error)
            throw new Error(
              "Credential reviews could not load. Apply migration 202609220013_credential_reviews.sql, then retry.",
            );
          all.push(...data);
          if (data.length < 500) return all;
        }
      }
      const [requests, events] = await Promise.all([
        rows("credential_review_details"),
        rows("credential_review_events"),
      ]);
      return { requests, events };
    },
    { refreshInterval: 30000, shouldRetryOnError: false },
  );
  return {
    data: s.data,
    loading: s.isLoading,
    error: s.error?.message as string | undefined,
    refresh: s.mutate,
  };
}
